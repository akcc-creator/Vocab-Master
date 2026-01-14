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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: image // Expecting base64 string without prefix
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
    if (!text) throw new Error("No text returned");

    return new Response(text, {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Backend Image Extraction Error:", error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to extract words' }), { status: 500 });
  }
}