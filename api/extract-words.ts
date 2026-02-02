import { GoogleGenAI, Type } from "@google/genai";

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { image } = await request.json();

    if (!process.env.API_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error: API Key missing' }), { status: 500 });
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

    // Updated to Gemini 3 Flash for better OCR performance
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

    return new Response(text, {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Backend Image Extraction Error:", error);
    // Detect rate limit errors (429) from the Google GenAI SDK
    const isRateLimit = error.message?.includes('429') || error.status === 429;
    const status = isRateLimit ? 429 : 500;
    return new Response(JSON.stringify({ error: error.message || 'Failed to extract words' }), { status });
  }
}