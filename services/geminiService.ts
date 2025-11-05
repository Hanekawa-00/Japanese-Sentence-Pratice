import { GoogleGenAI, Type, Modality } from "@google/genai";
import { SentenceTask, Feedback, Difficulty, MultipleChoiceTask, SentenceLength, GrammarPoint } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Audio Decoding Helpers
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Speech Generation Service
export const generateSpeech = async (text: string): Promise<string | null> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say it clearly: ${text}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Leda' },
                },
            },
        },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null;
};


// Cache and loader for grammar data
let allGrammarPoints: GrammarPoint[] = [];

const loadGrammarData = async (): Promise<void> => {
    if (allGrammarPoints.length > 0) {
        return;
    }
    try {
        const response = await fetch('/doc/jlpt_grammar_full.json');
        if (!response.ok) {
            throw new Error('Failed to load grammar data.');
        }
        const data: GrammarPoint[] = await response.json();
        allGrammarPoints = data;
    } catch (err) {
        console.error("Error fetching grammar data:", err);
        // If it fails, the app can proceed without grammar-focused questions.
        allGrammarPoints = [];
        throw err; // re-throw to be caught by caller
    }
};

export const getGrammarPoints = async (): Promise<GrammarPoint[]> => {
    await loadGrammarData();
    return allGrammarPoints;
};


const parseJsonResponse = <T,>(jsonString: string): T => {
    try {
        const cleanedString = jsonString.replace(/^```json\s*|```\s*$/g, '').trim();
        return JSON.parse(cleanedString);
    } catch (e) {
        console.error("Failed to parse JSON:", jsonString);
        throw new Error("Received an invalid JSON response from the AI.");
    }
};

const getLengthDescription = (length: SentenceLength): string => {
    switch (length) {
        case SentenceLength.Short:
            return 'The sentence should be short and simple, typically under 15 Chinese characters. Focus on a single, clear idea.';
        case SentenceLength.Medium:
            return 'The sentence should be of medium length, around 15-30 Chinese characters. It can contain one or two related ideas.';
        case SentenceLength.Long:
            return 'The sentence should be long and more complex, over 30 Chinese characters. It should challenge the user with multiple clauses, conjunctions, or more nuanced ideas.';
    }
};


const getLevelSpecificPrompt = (difficulty: Difficulty, length: SentenceLength, grammarPoint?: GrammarPoint): string => {
    const lengthDescription = getLengthDescription(length);
    let levelGuidance = '';
    switch (difficulty) {
        case Difficulty.N5:
            levelGuidance = "Focus on basic daily life topics like greetings, family, food, and shopping. The required Japanese translation should use simple です/ます forms and basic particles (は, が, を, に, で).";
            break;
        case Difficulty.N4:
            levelGuidance = "Introduce topics like hobbies, making plans, or asking for permission. The Japanese translation might involve potential form (～られる), conditional forms (～たら), or giving/receiving verbs (あげる, もらう).";
            break;
        case Difficulty.N3:
            levelGuidance = "Use sentences about work, school life, or expressing opinions. The Japanese translation could naturally use passive (～される), causative (～させる) forms, or expressions like ～はずだ or ～べきだ.";
            break;
        case Difficulty.N2:
            levelGuidance = "Create sentences related to social issues, news, or more formal situations. The Japanese translation would likely require using honorifics (敬語), or nuanced expressions like ～うちに or ～かわりに.";
            break;
        case Difficulty.N1:
            levelGuidance = "Generate complex sentences on abstract, technical, or literary topics. The Japanese translation should challenge the user with complex sentence structures, advanced vocabulary, and subtle grammatical nuances.";
            break;
    }
    
    const grammarInstruction = grammarPoint
        ? `5.  **Grammar Focus:** The Japanese translation of the sentence MUST naturally incorporate the following grammar point:
    - **Grammar:** ${grammarPoint.grammar_point}
    - **Meaning:** ${grammarPoint.meaning_cn}
    - **Usage:** ${grammarPoint.usage}`
        : `5.  **Grammar Focus:** Choose a common and useful grammar point appropriate for the JLPT ${difficulty} level and incorporate it naturally.`;


    return `You are an AI assistant that creates language learning materials. Your task is to generate a single, natural-sounding Chinese sentence for a student to translate into Japanese.

**Instructions:**
1.  **Target Level & Topic:** The sentence must be appropriate for a **JLPT ${difficulty}** learner. ${levelGuidance}
2.  **Natural Phrasing:** The sentence must sound like something from a real-life conversation, social media post, or modern blog. Avoid overly academic, stiff, or textbook-like sentences.
3.  **Sentence Length:** Adhere to the **${length}** length requirement.
    - **Guideline:** ${lengthDescription}
4.  **Goal:** Provide a practical sentence for real-world communication practice.
${grammarInstruction}

**Response Format:**
Your response must be a single JSON object with the key 'chineseSentence'. Do not add any other text.
`;
};


export const generateSentenceTask = async (difficulty: Difficulty, length: SentenceLength): Promise<SentenceTask> => {
    await loadGrammarData();
    
    const relevantGrammar = allGrammarPoints.filter(p => p.level === difficulty);
    const grammarPoint = relevantGrammar.length > 0
        ? relevantGrammar[Math.floor(Math.random() * relevantGrammar.length)]
        : undefined;

    const prompt = getLevelSpecificPrompt(difficulty, length, grammarPoint);
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    chineseSentence: { type: Type.STRING },
                },
                required: ["chineseSentence"],
            },
            temperature: 0.9,
        },
    });

    const jsonText = response.text.trim();
    const task = parseJsonResponse<{ chineseSentence: string }>(jsonText);
    
    return { ...task, grammarPoint };
};

const fullOutline = `
---
**《日语表达规范总纲》 (Japanese Expression Specification Outline)**
You MUST adhere to these rules when generating your evaluation. This outline is your primary guide.

一、句子结构基础

1.1 构成要素
主语（主部）：动作或状态的主体。常由名词+「が／は」构成。例：風が吹く、森さんは作家だ。
述语（谓语）：表示动作、性质、存在等的核心部分，句末收束。分为动作性（どうする）、状态性（どんなだ）、判断性（何だ）、存在性（ある・いる）。
修饰语：对主语或述语进行限定说明。时间・地点・对象・方式・性质・程度等必须位于被修饰语之前。
接续语：连接句与句的关系（顺接、转折、补充等）。如：「そして」「しかし」「それから」。
独立语：脱离句法结构、用于提示、感叹、呼唤。如：「さあ」「おい」「えっと」。

1.2 基本句式结构
结构：（修饰语）主语 + （修饰语）述语
原则：修饰语前置。述语句尾。主从句关系清晰，不能混乱嵌套。

1.3 句型分类
单句：一组主述语。例：「李さんが図書館で勉強している。」
复句（主从句）：从句位于主句前，用动词连体形修饰。原则：从句主语多用「が」，主句述语句尾收束。
并列句：多个主述语并列，通过「て」「し」「が」连接。例：「枝が伸び、葉がしげる。」

1.4 四大基本句式
判断句：～のは～です、～のは～だからです
描写句：～のは～です（危险・难易等）
能力句：～のが好き／上手／下手／苦手
存在句：～には～がある、～は～にある

二、修饰语原则与形式体言

2.1 修饰语基本原则
修饰语必须位于被修饰语之前。
顺序公式：「谁が」「何を」「いつ」「どこで」「谁と」「何で」「どうした」
排序原则：长前短后；有主谓结构的修饰语放前，无主谓结构的放后。例：「あそこに立っている髪が長い人」

2.2 修饰语接续方式
形容词修饰动词：形容词て形/く形 + 动词 (早く起きる)
副词修饰动词：副词 + 动词 (ゆっくり走る)
副词修饰形容词：副词 + 形容词 (とても美しい)
副词修饰副词：副词 + 副词 + 动词 (かなりしっかりと勉強する)

2.3 动词、形容词、名词的连体形式
动词：書く／書かない／書いた／書かなかった (書いた手紙)
イ形容词：美味しい／美味しくない／美味しかった (美味しいケーキ)
ナ形容词：元気な／元気でない／元気だった (元気な子供)
名词：休みの／休みだった (休みの日、先生である森さん)

2.4 修饰句动词的时态
有时间提示词 → 明确时态 (明日使う資料／昨日使った資料)
无时间提示词 → 依照主句动作前后判断 (食べ残ったカレーを温めて食べましょう)

2.5 修饰句主语的「が／の」转换
单一主谓结构：可以互换 (「母が作った料理」＝「母の作った料理」)
非单一结构：动作主体特定时不可换 (「母が豆腐で作った料理」✕)，状态/属性类可换 (「かかとのすり減った靴」○)

2.6 形式体言用法
こと：名词化抽象动作 (勉強することを決めた／音楽を聴くことです)
の：名词化具象感知 (鳥が鳴いているのを聞いた／母が料理をするのを見た)

三、表达习惯

3.1 話者中心性原则
事件描述以说话者或主要参与者的视点展开。当说话者受影响时，用被动句更自然 (医者に言われた、彼に待たされた)。

3.2 受身表达（被动句）
强调"我受到影响"。多用于表达受害、被动作、心理共鸣。"他让我等了"→「彼に待たされた」。

3.3 授受表达
接受他人行为：～てもらう (髪を切ってもらった)
表达感谢/期望：～てくれる (教えてくれてありがとう)
表示我为别人做：～てあげる (手伝ってあげた)

3.4 动作方向助动词
～ていく：动作离开说话者 (見ていってくれない？)
～てくる：动作朝向说话者 (呼んでくる／電話をかけてくる)

3.5 情态表达（モダリティ）
对事实的判断、态度、情绪。包含对事（断定・推测）与对人（请求・感叹）。
常见形式：だろう、かもしれない、そうだ、ようだ、ね、よ、てほしい、もらいたい等。

四、俗语与表达转换

4.1 三层表达维度
意思（字面信息）、意境（语境背景）、意图（表达目的）。外语表达要关注语境与意图，而非直译。

4.2 转化策略
理解含义 → 寻找等价日语表达 → 组合成句。例：「搅屎棍」→「引っ掻き回し屋」。

4..3 表达层次控制
中文直译「明天有点...」→ 日语自然表达「明日はちょっと...」（婉拒）
中文直译「我没空」→ 日语自然表达「あいにく予定がありまして...」（礼貌拒绝）

4.4 成语与比喻
一箭双雕 → 一石二鳥
三思而后行 → 石橋を叩いて渡る
马后炮 → 後の祭り
井底之蛙 → 井の中の蛙

五、常用句式

5.1 原因・解释: ～というのは～からです／～のは～ためです, ～だからこそ～のだ, どうりで～わけだ
5.2 条件・假设: もし～たらどうする？, ～ば～のに, ～ば～はずだ
5.3 希望・意图: すこしでも～ように, せめて～てほしい, もしよかったら～ませんか
5.4 程度・比较: ～は～よりずっと～, ～に直結している

六、一词多译语境

6.1 "只要～就～": ～限り（は）, ～さえ～ば
6.2 "除非～否则～": ～ない限り～ない
6.3 "没必要～": ～には及ばない／～ことはない／～必要はない
6.4 "既然～就～": ～からには／～以上は／～上は
6.5 "偏偏～": ～に限って／よりによって

七、常用表达

7.1 基本会话模板: 自我介绍, 年龄, 家庭, 趣味
7.2 日常会话表达: 天气, 感谢, 请求, 询问

✅【综合规范要点总结】
句法结构: 谓语句尾，修饰语前置，主从清晰
助词使用: 根据句义选择を、に、で、へ、から、まで、が、は
修饰关系: 长前短后；主谓句修饰放前
时态一致: 动词与时间提示词匹配
敬体/常体: 语境决定，用「です・ます」体现礼貌度
自然表达: 话者中心；多用被动句与授受表达
语气与情态: 根据情感、态度选用适当助动词
文化语感: 注重委婉表达与语境转换
常用句式: 善用结构化句型表达因果、假设、希望、比较
---
`;

export const evaluateSentenceStream = async (
  task: SentenceTask,
  userTranslation: string,
  onStructuredData: (data: { score: number; evaluation: string; correctedSentence: string }) => void,
  onExplanationChunk: (chunk: string) => void,
  onStreamEnd: () => Promise<void>,
): Promise<void> => {
    const grammarFocus = task.grammarPoint 
        ? `The specific grammar point for this exercise is:
- **Grammar:** ${task.grammarPoint.grammar_point}
- **Meaning:** ${task.grammarPoint.meaning_cn}
- **Usage:** ${task.grammarPoint.usage}
Your explanation should pay special attention to whether the student used this grammar point correctly and naturally.`
        : '';

    const prompt = `You are a helpful and patient Japanese language teacher. Your core task is to evaluate a student's translation based on the provided "Japanese Expression Specification Outline". Your feedback must be precise, constructive, and educational.

The original Chinese sentence is: "${task.chineseSentence}"
The student's Japanese translation is: "${userTranslation || '(No answer provided)'}".
${grammarFocus}

${fullOutline}

**Response Format:**
Your response MUST follow this structure exactly. Do not add any other text or formatting.
1.  Start with a line containing \`score:\` followed by a number from 0 to 100.
2.  The next line MUST be \`evaluation:\` followed by a short, one-to-three-word evaluation in Chinese (e.g., 完美！, 很好, 有点可惜, 再加油).
3.  The next line MUST be \`correctedSentence:\` followed by the corrected or most natural Japanese sentence.
4.  The fourth line MUST be \`--- \`.
5.  Everything after the \`--- \` is the detailed explanation in Chinese Markdown. If the student provided no answer, your explanation should simply state that and provide a brief breakdown of the correct answer.

Example:
score: 85
evaluation: 很好！
correctedSentence: 私の猫はとても可愛いです。
--- 
- **语法:** 你的句子在语法上是正确的，但是...
`;

    try {
        const stream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        let buffer = '';
        let headersParsed = false;

        for await (const chunk of stream) {
            const text = chunk.text;
            if (text) {
                if (headersParsed) {
                    onExplanationChunk(text);
                    continue;
                }
                
                buffer += text;
                const separator = '\n--- \n';
                const separatorIndex = buffer.indexOf(separator);

                if (separatorIndex !== -1) {
                    headersParsed = true;
                    const header = buffer.substring(0, separatorIndex);
                    
                    const scoreMatch = header.match(/^score:\s*(\d+)/m);
                    const evaluationMatch = header.match(/^evaluation:\s*(.*)/m);
                    const correctedSentenceMatch = header.match(/^correctedSentence:\s*(.*)/m);

                    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
                    const evaluation = evaluationMatch ? evaluationMatch[1].trim() : '评价未提供';
                    const correctedSentence = correctedSentenceMatch ? correctedSentenceMatch[1].trim() : '(AI did not provide a correction.)';
                    
                    onStructuredData({ score, evaluation, correctedSentence });

                    const firstChunk = buffer.substring(separatorIndex + separator.length);
                    if (firstChunk) {
                        onExplanationChunk(firstChunk);
                    }
                }
            }
        }
        
        // Fallback for when the stream ends but the separator was never found
        if (!headersParsed && buffer.length > 0) {
            const headerPart = buffer;
            const separator = '\n--- \n';
            const separatorIndex = headerPart.indexOf(separator);
            
            const headers = separatorIndex !== -1 ? headerPart.substring(0, separatorIndex) : headerPart;

            const scoreMatch = headers.match(/^score:\s*(\d+)/m);
            const evaluationMatch = headers.match(/^evaluation:\s*(.*)/m);
            const correctedSentenceMatch = headers.match(/^correctedSentence:\s*(.*)/m);

            const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
            const evaluation = evaluationMatch ? evaluationMatch[1].trim() : '评价未提供';
            const correctedSentence = correctedSentenceMatch ? correctedSentenceMatch[1].trim() : '(AI did not provide a correction.)';
            
            onStructuredData({ score, evaluation, correctedSentence });
            
            let explanation = '';
            if (separatorIndex !== -1) {
                explanation = headerPart.substring(separatorIndex + separator.length);
            } else {
                 // No separator, guess explanation starts after correctedSentence
                const lines = headers.split('\n');
                const correctedLineIndex = lines.findIndex(line => line.startsWith('correctedSentence:'));
                if (correctedLineIndex !== -1 && correctedLineIndex + 1 < lines.length) {
                    explanation = lines.slice(correctedLineIndex + 1).join('\n').trim();
                }
            }

            if (explanation) {
                onExplanationChunk(explanation);
            }
        }

    } catch (error) {
        console.error("Error during stream evaluation:", error);
        onExplanationChunk("\n\n**Error:** Failed to get feedback from the AI. Please try again.");
    } finally {
        await onStreamEnd();
    }
};


export const generateMultipleChoiceTask = async (difficulty: Difficulty, length: SentenceLength): Promise<MultipleChoiceTask> => {
    await loadGrammarData();

    const relevantGrammar = allGrammarPoints.filter(p => p.level === difficulty);
    const grammarPoint = relevantGrammar.length > 0
        ? relevantGrammar[Math.floor(Math.random() * relevantGrammar.length)]
        : undefined;

    const lengthDescription = getLengthDescription(length);

    const grammarInstruction = grammarPoint
        ? `1.  **Core Concept:** You MUST test the student on the following grammar point:
    - **Grammar:** ${grammarPoint.grammar_point}
    - **Meaning:** ${grammarPoint.meaning_cn}
    - **Usage:** ${grammarPoint.usage}`
        : `1.  **Core Concept:** Based on the requested JLPT difficulty level (${difficulty}), choose a specific principle from the "Japanese Expression Specification Outline" to test.`;
        
    const prompt = `You are an expert Japanese language teacher designing a multiple-choice quiz based on the provided "Japanese Expression Specification Outline". Your goal is to create challenging questions that test a learner's understanding of natural Japanese phrasing versus common mistakes.

**Task:**
${grammarInstruction}
2.  **Create a Scenario:** Write a single Chinese sentence that requires the application of this concept for a natural translation. This sentence MUST adhere to the following length requirement:
    - **Selected length:** ${length}
    - **Guideline:** ${lengthDescription}
3.  **Generate Options:**
    *   **Correct Answer:** Provide one perfectly natural and grammatically correct Japanese translation that correctly uses the target grammar.
    *   **"Chinglish" Distractor:** Provide one incorrect option that is a direct, literal translation from the Chinese sentence. This should be a very tempting mistake for a native Chinese speaker.
    *   **Other Distractors:** Provide 1 or 2 other incorrect options that test related but incorrect grammar points.
    *   You must generate a total of 3 or 4 options.
4.  **Write a Detailed Explanation:** In clear and educational Chinese, provide a thorough analysis of all options.
    *   Your explanation MUST be well-structured and easy to read.
    *   Start with a brief summary of the core concept being tested.
    *   Then, analyze each option one by one on separate lines, using newlines to create a list.
    *   For the correct option, explain in detail why it's the most natural and grammatically correct choice.
    *   For each incorrect option, clearly explain the specific error (e.g., unnatural phrasing, grammatical mistake, wrong nuance).
    *   The goal is to teach the learner, not just give them the answer. The explanation should be comprehensive and insightful, going beyond a simple right/wrong analysis. Do NOT mention the "《日语表达规范总纲》" or its section numbers.
5.  **Format the Output:** Return a single, clean JSON object. The options array should be shuffled randomly.

${fullOutline}

**Requested JLPT Level:** ${difficulty}

**Response JSON Format:**
Your response must be a single, clean JSON object with the following structure. Do not include any other text, comments, or markdown formatting outside of the JSON object.
`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    chineseSentence: { type: Type.STRING },
                    options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                    },
                    correctOptionIndex: { type: Type.NUMBER },
                    explanation: { type: Type.STRING },
                },
                required: ["chineseSentence", "options", "correctOptionIndex", "explanation"],
            },
            temperature: 0.8,
        },
    });

    const jsonText = response.text.trim();
    const task = parseJsonResponse<Omit<MultipleChoiceTask, 'grammarPoint'>>(jsonText);
    return { ...task, grammarPoint };
};