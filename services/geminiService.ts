import { GoogleGenAI, Type } from "@google/genai";
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

const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      originalWord: { type: Type.STRING, description: "The original word provided by the user." },
      correctForm: { type: Type.STRING, description: "The grammatically correct form of the word to fit the sentence." },
      sentenceBefore: { type: Type.STRING, description: "The part of the sentence coming BEFORE the blank." },
      sentenceAfter: { type: Type.STRING, description: "The part of the sentence coming AFTER the blank." },
      translation: { type: Type.STRING, description: "A brief translation or synonym hint of the word in Chinese (if English word) or English (if Chinese word)." },
    },
    required: ["originalWord", "correctForm", "sentenceBefore", "sentenceAfter"],
  },
};

export const generateQuiz = async (words: string[], difficulty: Difficulty): Promise<Question[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Create a robust prompt
  const prompt = `
    You are an expert language teacher creating a fill-in-the-blank vocabulary quiz.
    
    Target Audience Level: ${difficulty}
    Vocabulary List: ${JSON.stringify(words)}

    Instructions:
    1. For each word in the list, create ONE sentence appropriate for the target audience level.
    2. The sentence must contain a blank where the word belongs.
    3. CRITICAL: Modify the word form to fit the grammatical context of the sentence perfectly.
       - Example: If word is "run" and sentence is past tense, the correct form is "ran".
    4. **CONTEXT IS KEY**: The sentence must be descriptive enough (approx 12-25 words) so the student can logically deduce the meaning of the missing word from the context. Avoid short, ambiguous sentences.
       - Bad: "He is _____."
       - Good: "Because he won the race and received a gold medal, the boy felt incredibly _____."
    5. For Chinese words, ensure the context is natural and substantial.
    6. Provide the sentence split into two parts: 'sentenceBefore' the blank and 'sentenceAfter' the blank.
    7. Include a brief translation/hint.
    8. Return strict JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        thinkingConfig: { thinkingBudget: 0 } // Speed over deep thought for simple generation
      },
    });

    const rawData = response.text;
    if (!rawData) throw new Error("No data returned from AI");

    const parsedData = JSON.parse(rawData);

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
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate quiz. Please check your words and try again.");
  }
};

export const extractWordsFromImage = async (base64Image: string): Promise<string[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          },
          {
            text: "Analyze this image and extract a list of educational vocabulary words found in the text. Return ONLY a JSON array of strings. Ignore common stop words like 'the', 'is', 'and'. Focus on nouns, verbs, and adjectives suitable for learning."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Image Analysis Error:", error);
    throw new Error("Failed to extract words from image.");
  }
};