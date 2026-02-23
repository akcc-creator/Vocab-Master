import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for image uploads
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.post("/api/generate-quiz", async (req, res) => {
    try {
      const { words, difficulty } = req.body;

      if (!process.env.API_KEY) {
        res.status(500).json({ error: 'Server configuration error: API Key missing' });
        return;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // Schema definition for strict JSON output
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
                translation: { type: Type.STRING },
              },
              required: ["originalWord", "correctForm", "sentenceBefore", "sentenceAfter", "translation"],
            },
          },
        },
        required: ["quizItems"],
      };

      const prompt = `
        You are an expert language teacher creating a fill-in-the-blank vocabulary quiz.
        
        Target Audience Level: ${difficulty}
        Vocabulary List: ${JSON.stringify(words)}
  
        Instructions:
        1. For each word in the list, create exactly ONE fill-in-the-blank question.
        2. Detect the language of the input word:
           - If the input word is English, the sentence must be in English. Provide a Chinese translation/hint.
           - If the input word is Chinese, the sentence must be in Chinese. Provide an English translation/hint.
        3. The "correctForm" must be the EXACT word (or grammatically correct form) that fits in the blank.
           - For English verbs/nouns, conjugate or pluralize if necessary (e.g., "run" -> "running").
           - For Chinese, use the appropriate context.
        4. The sentence should be descriptive enough (12-25 words) that the answer can be logically deduced.
        5. Split the sentence into 'sentenceBefore' (part before the blank) and 'sentenceAfter' (part after the blank).
        
        Output strictly in JSON format matching the schema.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: quizSchema,
        },
      });

      const text = response.text;
      if (!text) throw new Error("No data returned from AI");

      res.json(JSON.parse(text));

    } catch (error: any) {
      console.error("Backend Quiz Generation Error:", error);
      const isRateLimit = error.message?.includes('429') || error.status === 429;
      const status = isRateLimit ? 429 : 500;
      res.status(status).json({ error: error.message || 'Failed to generate quiz' });
    }
  });

  app.post("/api/extract-words", async (req, res) => {
    try {
      const { image } = req.body;

      if (!process.env.API_KEY) {
        res.status(500).json({ error: 'Server configuration error: API Key missing' });
        return;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const extractionSchema = {
        type: Type.OBJECT,
        properties: {
          extractedWords: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["extractedWords"],
      };

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
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
                Extract educational vocabulary words from this image.
                1. Identify key objects, actions, or adjectives suitable for vocabulary learning.
                2. Ignore common stop words (the, is, and, etc.).
                3. If text appears in the image, extract relevant vocabulary from it.
                4. Return a clean list of base form words.
              `
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: extractionSchema,
        }
      });

      const text = response.text;
      if (!text) throw new Error("No text returned");

      res.json(JSON.parse(text));

    } catch (error: any) {
      console.error("Backend Image Extraction Error:", error);
      const isRateLimit = error.message?.includes('429') || error.status === 429;
      const status = isRateLimit ? 429 : 500;
      res.status(status).json({ error: error.message || 'Failed to extract words' });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving (if needed, though usually handled by build output)
    // For this environment, we assume dev mode mostly, but good to have placeholders
    app.use(express.static('dist'));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
