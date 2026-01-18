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

    // WRAPPER OBJECT PATTERN: More stable than root Arrays
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        quizItems: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              originalWord: { type: Type.STRING, description: "The original word provided by the user." },
              correctForm: { type: Type.STRING, description: "The grammatically correct form of the word to fit the sentence context." },
              sentenceBefore: { type: Type.STRING, description: "The part of the sentence coming BEFORE the blank." },
              sentenceAfter: { type: Type.STRING, description: "The part of the sentence coming AFTER the blank." },
              translation: { type: Type.STRING, description: "A brief translation or synonym hint of the word (Chinese for English words, English for Chinese words)." },
            },
            required: ["originalWord", "correctForm", "sentenceBefore", "sentenceAfter"],
          },
        }
      }
    };

    const prompt = `
      You are an expert language teacher creating a fill-in-the-blank vocabulary quiz.
      
      Target Audience Level: ${difficulty}
      Vocabulary List: ${JSON.stringify(words)}

      Instructions:
      1. For each word in the list, create ONE sentence appropriate for the target audience level.
      2. The sentence must contain a blank where the word belongs.
      3. **CRITICAL: Form Adaptation**: Modify the word form to fit the grammatical context perfectly (e.g., "run" -> "running" or "ran").
      4. **Context Clues**: The sentence must be descriptive (12-25 words) so the student can logically deduce the answer.
         - Bad: "He is _____."
         - Good: "After running the marathon in record time, the athlete felt incredibly _____ and needed to rest."
      5. **Bilingual Support**: 
         - If the input word is English, provide a Chinese hint/translation.
         - If the input word is Chinese, provide an English hint/translation.
      6. Split the sentence into 'sentenceBefore' and 'sentenceAfter' the blank.
      7. Return a JSON object containing a 'quizItems' array.
    `;

    // Switched to gemini-2.0-flash for higher RPD limits (1500/day vs 20/day for 3.0-preview)
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
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