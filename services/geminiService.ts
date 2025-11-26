import { GoogleGenAI } from "@google/genai";
import { Language } from "../types";

let ai: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!ai) {
    // Safe access pattern: Default to empty object if import.meta.env is undefined
    const env = (import.meta as any).env || {};
    const apiKey = env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn("Gemini API Key missing. AI features will be disabled.");
      throw new Error("VITE_GEMINI_API_KEY environment variable is missing.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

export const getTranslationSuggestion = async (
  sentence: string,
  targetLanguage: Language
): Promise<string> => {
  try {
    const client = getAiClient();
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Translate to ${targetLanguage.name}: "${sentence}"`,
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "";
  }
};

export const validateTranslation = async (
  original: string,
  translation: string,
  language: Language
): Promise<{ score: number; feedback: string }> => {
  try {
    const client = getAiClient();
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Rate translation 1-10 and feedback. English: "${original}". ${language.name}: "${translation}". Return JSON { "score": number, "feedback": string }`,
      config: { responseMimeType: "application/json" },
    });

    const text = response.text;
    if (!text) return { score: 0, feedback: "No response from AI." };

    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Validation Error:", error);
    return { score: 0, feedback: "AI Service Unavailable." };
  }
};