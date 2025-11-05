export enum GameState {
  Welcome,
  Practicing,
  Loading,
  Feedback,
  Grammar,
  History,
}

export enum GameMode {
  Translation = 'TRANSLATION',
  MultipleChoice = 'MULTIPLE_CHOICE',
}

export enum Difficulty {
  N5 = 'N5',
  N4 = 'N4',
  N3 = 'N3',
  N2 = 'N2',
  N1 = 'N1',
}

export enum SentenceLength {
  Short = '短',
  Medium = '中',
  Long = '长',
}

export interface SentenceTask {
  chineseSentence: string;
  grammarPoint?: GrammarPoint;
}

export interface MultipleChoiceTask {
  chineseSentence: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  grammarPoint?: GrammarPoint;
}

export interface Feedback {
  score: number;
  evaluation: string;
  correctedSentence: string;
  explanation: string;
}

export interface GrammarPoint {
  level: Difficulty;
  grammar_point: string;
  meaning_cn: string;
  usage: string;
  example_ja: string;
  example_cn: string;
  note: string;
}

export type TranslationHistoryItem = {
  id: string;
  timestamp: number;
  gameMode: GameMode.Translation;
  difficulty: Difficulty;
  sentenceLength: SentenceLength;
  chineseSentence: string;
  userSentence: string;
  correctedSentence: string;
  score: number;
  evaluation: string;
  feedbackExplanation: string;
  grammarPoint?: GrammarPoint;
  audioBase64?: string;
};

export type MultipleChoiceHistoryItem = {
  id: string;
  timestamp: number;
  gameMode: GameMode.MultipleChoice;
  difficulty: Difficulty;
  sentenceLength: SentenceLength;
  chineseSentence: string;
  options: string[];
  userChoiceIndex: number; // -1 if user skipped
  correctOptionIndex: number;
  mcqExplanation: string;
  grammarPoint?: GrammarPoint;
  audiosBase64?: (string | null)[];
};

export type HistoryItem = TranslationHistoryItem | MultipleChoiceHistoryItem;