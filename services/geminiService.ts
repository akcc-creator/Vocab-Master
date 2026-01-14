import { Difficulty, Question } from "../types";

// Helper to shuffle array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export const generateQuiz = async (words: string[], difficulty: Difficulty): Promise<Question[]> => {
  try {
    const response = await fetch('/api/generate-quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ words, difficulty }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate quiz');
    }

    const parsedData = await response.json();

    // Map to our internal Question type and add IDs
    const questions: Question[] = parsedData.map((item: any, index: number) => ({
      id: `q-${index}-${Date.now()}`,
      originalWord: item.originalWord,
      correctForm: item.correctForm,
      sentenceBefore: item.sentenceBefore || "",
      sentenceAfter: item.sentenceAfter || "",
      translation: item.translation
    }));

    // Shuffle the questions so they aren't in the same order as input
    return shuffleArray(questions);

  } catch (error) {
    console.error("API Error:", error);
    throw new Error("Failed to generate quiz. Please check your words and try again.");
  }
};

export const extractWordsFromImage = async (base64Image: string): Promise<string[]> => {
  try {
    const response = await fetch('/api/extract-words', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to analyze image');
    }

    return await response.json();
  } catch (error) {
    console.error("Image Analysis Error:", error);
    throw new Error("Failed to extract words from image.");
  }
};