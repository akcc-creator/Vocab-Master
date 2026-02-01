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

    if (response.status === 429) {
      throw new Error("已達到 API 使用上限 (Too Many Requests)。請休息一分鐘後再試。");
    }

    if (!response.ok) {
      let errorMessage = 'Failed to generate quiz';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // If response isn't JSON (e.g., 500 HTML page), use status text
        errorMessage = `Server Error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const parsedData = await response.json();
    
    // Handle the wrapper object { quizItems: [...] }
    const items = parsedData.quizItems || [];

    if (!Array.isArray(items)) {
      throw new Error("Invalid data format received from AI");
    }

    // Map to our internal Question type and add IDs
    const questions: Question[] = items.map((item: any, index: number) => ({
      id: `q-${index}-${Date.now()}`,
      originalWord: item.originalWord,
      correctForm: item.correctForm,
      sentenceBefore: item.sentenceBefore || "",
      sentenceAfter: item.sentenceAfter || "",
      translation: item.translation
    }));

    // Shuffle the questions so they aren't in the same order as input
    return shuffleArray(questions);

  } catch (error: any) {
    console.error("API Error:", error);
    throw new Error(error.message || "Failed to generate quiz. Please check your words and try again.");
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

    if (response.status === 429) {
      throw new Error("已達到 API 使用上限 (Too Many Requests)。請休息一分鐘後再試。");
    }

    if (!response.ok) {
      let errorMessage = 'Failed to analyze image';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        errorMessage = `Server Error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const parsedData = await response.json();
    // Handle the wrapper object { extractedWords: [...] }
    const words = parsedData.extractedWords || [];
    
    if (!Array.isArray(words)) {
       throw new Error("Invalid data format received from AI");
    }

    return words;
  } catch (error: any) {
    console.error("Image Analysis Error:", error);
    throw new Error(error.message || "Failed to extract words from image.");
  }
};