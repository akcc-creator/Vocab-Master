import { GoogleGenAI, Type } from "@google/genai";

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { words, difficulty } = await request.json();

    if (!process.env.API_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error: API Key missing' }), { status: 500 });
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

    return new Response(text, {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Backend Quiz Generation Error:", error);
    // Detect rate limit errors (429) from the Google GenAI SDK
    const isRateLimit = error.message?.includes('429') || error.status === 429;
    const status = isRateLimit ? 429 : 500;
    return new Response(JSON.stringify({ error: error.message || 'Failed to generate quiz' }), { status });
  }
}