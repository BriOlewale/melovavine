import { GoogleGenAI } from "@google/genai";
import type { Language } from "../types";

let ai: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!ai) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY environment variable is missing.");
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

    // Depending on SDK version, adjust how you read text:
    // @ts-ignore – tolerate slight SDK type differences
    const text = typeof response.text === "function" ? response.text() : response.text;
    return (text || "").trim();
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

    // @ts-ignore – see note above
    const text = typeof response.text === "function" ? response.text() : response.text;
    if (!text) {
      return { score: 0, feedback: "No response from AI." };
    }

    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Validation Error:", error);
    return { score: 0, feedback: "AI Service Unavailable." };
  }
};
