import express from "express";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();

app.use(express.json({ limit: "10mb" }));

app.post("/api/generate-quiz", async (req, res) => {
  try {
    const { words, difficulty } = req.body as {
      words?: string[];
      difficulty?: string;
    };

    if (!Array.isArray(words) || words.length === 0) {
      res.status(400).json({ error: "Words array is required." });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res
        .status(500)
        .json({ error: "Server configuration error: GEMINI_API_KEY missing" });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    const quizSchema = {
      type: Type.OBJECT,
      properties: {
        quizItems: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              originalWord: { type: Type.STRING },
              correctForm: { type: Type.STRING },
              sentenceBefore: { type: Type.STRING },
              sentenceAfter: { type: Type.STRING },
              translation: { type: Type.STRING }
            },
            required: [
              "originalWord",
              "correctForm",
              "sentenceBefore",
              "sentenceAfter",
              "translation"
            ]
          }
        }
      },
      required: ["quizItems"]
    };

    const prompt = `
You are an expert language teacher creating a fill-in-the-blank vocabulary and grammar quiz.

Target audience level: ${difficulty ?? "Upper Primary"}

Vocabulary list:
${JSON.stringify(words)}

Instructions:
1. Create exactly ONE fill-in-the-blank question for EACH word.
2. Detect the input language:
   - If the word is English, write the sentence in English and provide a Traditional Chinese hint.
   - If the word is Chinese, write the sentence in Chinese and provide an English hint.
3. CRITICAL: Make the questions grammatically challenging! Do NOT just use the exact input word every time.
   - Design sentences that FORCE the student to change the word's form based on context.
   - For English verbs: require past tense, continuous (-ing), past participle, or third-person singular (-s).
   - For English nouns: require plural forms.
   - For English word families: change to adjectives/adverbs/nouns (e.g., "beauty" -> "beautiful", "quick" -> "quickly", "success" -> "succeed").
   - The "originalWord" must be the exact word from the list, but "correctForm" MUST be the modified word that fits the blank.
4. The sentence should provide enough context clues (like time words "yesterday", "now", or structural clues) for the student to deduce the correct form.
5. Split the sentence into:
   - sentenceBefore = text before the blank
   - sentenceAfter = text after the blank
6. Output STRICT JSON matching the given schema only.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No data returned from AI");
    }

    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (error: any) {
    console.error("Backend Quiz Generation Error:", error);
    const isRateLimit =
      error?.message?.includes("429") || error?.status === 429;
    res
      .status(isRateLimit ? 429 : 500)
      .json({ error: error?.message || "Failed to generate quiz" });
  }
});

app.post("/api/extract-words", async (req, res) => {
  try {
    const { image } = req.body as { image?: string };

    if (!image) {
      res.status(400).json({ error: "Image is required." });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res
        .status(500)
        .json({ error: "Server configuration error: GEMINI_API_KEY missing" });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    const extractionSchema = {
      type: Type.OBJECT,
      properties: {
        extractedWords: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: ["extractedWords"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: image
            }
          },
          {
            text: `
Extract vocabulary words from this educational image.

Rules:
1. Return only useful vocabulary items.
2. Remove duplicates.
3. Keep the words concise.
4. Output STRICT JSON matching the schema only.
`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: extractionSchema
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No data returned from AI");
    }

    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (error: any) {
    console.error("Backend Image Extraction Error:", error);
    const isRateLimit =
      error?.message?.includes("429") || error?.status === 429;
    res
      .status(isRateLimit ? 429 : 500)
      .json({ error: error?.message || "Failed to extract words" });
  }
});

export default app;
