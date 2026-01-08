export enum Difficulty {
  PRIMARY_LOWER = "Primary 1-3 (Lower)",
  PRIMARY_UPPER = "Primary 4-6 (Upper)",
  SECONDARY_LOWER = "Secondary 1-3 (Lower)",
  SECONDARY_UPPER = "Secondary 4-6 (Upper)"
}

export interface Question {
  id: string;
  originalWord: string;
  correctForm: string;
  sentenceBefore: string;
  sentenceAfter: string;
  translation?: string; // Hint in native language if applicable
}

export interface QuizSettings {
  words: string[];
  difficulty: Difficulty;
}

export interface AnswerState {
  userInput: string;
  isCorrect: boolean | null; // null = not checked yet
  isRevealed: boolean;
}