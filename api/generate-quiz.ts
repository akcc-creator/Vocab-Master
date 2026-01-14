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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        thinkingConfig: { thinkingBudget: 0 }
      },
    });

    const text = response.text;
    if (!text) throw new Error("No data returned from AI");

    return new Response(text, {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Backend Quiz Generation Error:", error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to generate quiz' }), { status: 500 });
  }
}