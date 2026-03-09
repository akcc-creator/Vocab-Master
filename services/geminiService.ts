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

interface QuizApiResponse {
  quizItems: Array<{
    originalWord: string;
    correctForm: string;
    sentenceBefore: string;
    sentenceAfter: string;
    translation: string;
  }>;
}

interface ExtractWordsApiResponse {
  extractedWords: string[];
}

export const generateQuiz = async (
  words: string[],
  difficulty: Difficulty
): Promise<Question[]> => {
  try {
    const response = await fetch("/api/generate-quiz", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ words, difficulty })
    });

    if (response.status === 429) {
      throw new Error("已達到 API 使用上限，請稍後再試。");
    }

    if (!response.ok) {
      let errorMessage = "Failed to generate quiz";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = `Server Error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data: QuizApiResponse = await response.json();

    if (!data.quizItems || !Array.isArray(data.quizItems)) {
      throw new Error("Invalid quiz data received from server.");
    }

    const questions = data.quizItems.map((item, index) => ({
      id: `${item.originalWord}-${index}`,
      originalWord: item.originalWord,
      correctForm: item.correctForm,
      sentenceBefore: item.sentenceBefore,
      sentenceAfter: item.sentenceAfter,
      translation: item.translation
    }));

    return shuffleArray(questions);
  } catch (error: any) {
    console.error("Quiz Generation Error:", error);
    throw new Error(error?.message || "Failed to generate quiz.");
  }
};

export const extractWordsFromImage = async (
  base64Image: string
): Promise<string[]> => {
  try {
    const response = await fetch("/api/extract-words", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ image: base64Image })
    });

    if (response.status === 429) {
      throw new Error("已達到 API 使用上限，請稍後再試。");
    }

    if (!response.ok) {
      let errorMessage = "Failed to analyze image";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = `Server Error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data: ExtractWordsApiResponse = await response.json();

    if (!Array.isArray(data.extractedWords)) {
      throw new Error("Invalid extracted words format.");
    }

    return data.extractedWords;
  } catch (error: any) {
    console.error("Image Analysis Error:", error);
    throw new Error(error?.message || "Failed to extract words from image.");
  }
};