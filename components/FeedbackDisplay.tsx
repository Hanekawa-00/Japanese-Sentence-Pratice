import React, { useState, useEffect, useRef } from 'react';
import { SentenceTask, Feedback } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { LightBulbIcon } from './icons/LightBulbIcon';
import MarkdownRenderer from './MarkdownRenderer';
import { evaluateSentenceStream, generateSpeech, decode, decodeAudioData } from '../services/geminiService';
import { SpeakerWaveIcon } from './icons/SpeakerWaveIcon';

interface FeedbackDisplayProps {
  task: SentenceTask;
  userSentence: string;
  onNext: () => void;
  onComplete: (feedback: Feedback, audioBase64: string | null) => void;
}

const getScoreColors = (score: number) => {
    if (score >= 80) return { ring: 'ring-green-400', text: 'text-green-300' };
    if (score >= 50) return { ring: 'ring-yellow-400', text: 'text-yellow-300' };
    return { ring: 'ring-red-400', text: 'text-red-400' };
};


const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ task, userSentence, onNext, onComplete }) => {
  const [feedback, setFeedback] = useState<Partial<Feedback>>({ explanation: '', score: undefined, evaluation: '' });
  const [isStreaming, setIsStreaming] = useState(true);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [cachedAudio, setCachedAudio] = useState<string | null>(null);

  // Use a ref to hold the final data to avoid race conditions with state updates
  const feedbackRef = useRef<Partial<Feedback>>({ explanation: '', score: undefined, evaluation: '' });

  useEffect(() => {
    // Initialize AudioContext once. Sample rate for TTS is 24000.
    // Use `any` for webkitAudioContext to avoid TS errors in some environments
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext({ sampleRate: 24000 });
      setAudioContext(ctx);
      return () => { ctx.close(); };
    }
  }, []);

  useEffect(() => {
    if (!task) return;

    feedbackRef.current = { explanation: '', score: undefined, evaluation: '' }; // Reset ref

    const streamEvaluation = async () => {
      setIsStreaming(true);
      setFeedback({ explanation: '', score: undefined, evaluation: '' }); 
      setCachedAudio(null);

      try {
        await evaluateSentenceStream(
          task,
          userSentence,
          (structuredData) => {
            setFeedback(prev => ({ ...prev, ...structuredData }));
            Object.assign(feedbackRef.current, structuredData);
          },
          (explanationChunk) => {
            setFeedback(prev => ({
              ...prev,
              explanation: (prev.explanation || '') + explanationChunk
            }));
            feedbackRef.current.explanation = (feedbackRef.current.explanation || '') + explanationChunk;
          },
          async () => {
            setIsStreaming(false);

            let audio: string | null = null;
            if (feedbackRef.current.correctedSentence) {
                setIsAudioLoading(true);
                audio = await generateSpeech(feedbackRef.current.correctedSentence);
                setCachedAudio(audio);
                setIsAudioLoading(false);
            }

            onComplete({
                score: feedbackRef.current.score ?? 0,
                evaluation: feedbackRef.current.evaluation ?? '评价未提供',
                correctedSentence: feedbackRef.current.correctedSentence ?? '(AI did not provide a correction.)',
                explanation: feedbackRef.current.explanation ?? ''
            }, audio);
          }
        );
      } catch (error) {
        console.error("Failed to stream feedback:", error);
        setFeedback(prev => ({
          ...prev,
          explanation: (prev.explanation || '') + "\n\n抱歉，分析时出现错误，请重试。"
        }));
        setIsStreaming(false);
        // Call onComplete even on error, but with null audio
        onComplete({
            score: 0,
            evaluation: 'Error',
            correctedSentence: '(Error)',
            explanation: '抱歉，分析时出现错误，请重试。'
        }, null);
      }
    };

    streamEvaluation();
    
  }, [task, userSentence, onComplete]);

  const handlePlayAudio = async () => {
    if (isAudioLoading || !audioContext || !cachedAudio) return;
    
    setIsAudioLoading(true);
    try {
      const audioData = decode(cachedAudio);
      const audioBuffer = await decodeAudioData(audioData, audioContext, 24000, 1);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
      source.onended = () => setIsAudioLoading(false);
    } catch (error) {
      console.error("Failed to play cached audio:", error);
      setIsAudioLoading(false);
    }
  };

  const scoreColors = feedback.score !== undefined ? getScoreColors(feedback.score) : getScoreColors(0);

  return (
    <div className="w-full p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg animate-fade-in space-y-6">
       <div className="flex flex-col items-center justify-center gap-2">
            {feedback.score !== undefined ? (
                <>
                    <div className={`relative w-32 h-32 rounded-full flex items-center justify-center bg-slate-900/50 ring-4 ${scoreColors.ring}`}>
                        <span className={`text-5xl font-bold ${scoreColors.text}`}>{feedback.score}</span>
                        <span className="absolute bottom-4 text-slate-400 text-sm">/ 100</span>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center gap-2">
                    <div className="w-32 h-32 bg-slate-700 rounded-full animate-pulse"></div>
                </div>
            )}
        </div>
      
      <div>
        <h3 className="text-lg font-semibold text-slate-300 mb-2">元の文 (中国語):</h3>
        <p className="p-3 bg-slate-900/50 rounded-lg text-slate-200">{task.chineseSentence}</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-300 mb-2">あなたの翻訳:</h3>
        <p className="p-3 bg-slate-900/50 rounded-lg text-slate-200">{userSentence || '(未回答)'}</p>
      </div>

      <div className={`p-4 rounded-lg bg-slate-900/30 border border-slate-600`}>
        <div className="flex justify-between items-center gap-2">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <CheckCircleIcon className="w-6 h-6 text-green-400" />
                修正・自然な翻訳:
            </h3>
            {feedback.correctedSentence && (
                 <button
                    onClick={handlePlayAudio}
                    disabled={isAudioLoading || !cachedAudio}
                    className="p-1.5 rounded-full text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-wait"
                    aria-label="Play corrected sentence audio"
                >
                    {isAudioLoading 
                        ? <div className="w-5 h-5 border-2 border-t-2 border-gray-400 border-t-white rounded-full animate-spin"></div> 
                        : <SpeakerWaveIcon className="w-5 h-5" />
                    }
                </button>
            )}
        </div>
        {feedback.correctedSentence ? (
            <p className="text-lg text-white mt-1">{feedback.correctedSentence}</p>
        ) : (
            <div className="h-7 bg-slate-700 rounded w-3/4 animate-pulse mt-1"></div>
        )}
      </div>

       <div className="p-4 rounded-lg bg-blue-900/50 border border-blue-500/50 min-h-[100px]">
        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <LightBulbIcon className="w-6 h-6 text-yellow-300" />
            讲解 (Explanation)
        </h3>
        <div className="text-slate-200 mt-3">
            <MarkdownRenderer markdown={feedback.explanation || ''} />
            {isStreaming && <span className="blinking-cursor"></span>}
            {isStreaming && !feedback.explanation && <div className="h-5 bg-slate-700 rounded w-1/2 animate-pulse mt-1"></div>}
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={isStreaming}
        className="w-full mt-4 px-8 py-3 bg-gradient-to-r from-blue-500 to-teal-400 text-white font-bold rounded-full hover:scale-105 transform transition-transform duration-300 focus:outline-none focus:ring-4 focus:ring-teal-300/50 shadow-lg disabled:bg-gray-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:scale-100"
      >
        次の文章 (Next Sentence)
      </button>
    </div>
  );
};

export default FeedbackDisplay;