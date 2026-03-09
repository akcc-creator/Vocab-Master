export enum Difficulty {
  PRIMARY_LOWER = "Lower Primary",
  PRIMARY_UPPER = "Upper Primary",
  SECONDARY = "Secondary",
  ADVANCED = "Advanced"
}

export interface Question {
  id: string;
  originalWord: string;
  correctForm: string;
  sentenceBefore: string;
  sentenceAfter: string;
  translation: string;
}