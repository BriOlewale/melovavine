import { GoogleGenAI } from "@google/genai";
import { Language } from '../types';

// Initialize the client exactly as required by guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getTranslationSuggestion = async (sentence: string, targetLanguage: Language): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Translate to ${targetLanguage.name}: "${sentence}"`,
    });
    return response.text?.trim() || '';
  } catch (error) {
    console.error("Gemini API Error:", error);
    return '';
  }
};

export const validateTranslation = async (original: string, translation: string, language: Language): Promise<{ score: number; feedback: string }> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Rate translation 1-10 and feedback. English: "${original}". ${language.name}: "${translation}". Return JSON { "score": number, "feedback": string }`,
            config: { responseMimeType: "application/json" }
        });
        
        const text = response.text;
        if (!text) return { score: 0, feedback: "No response from AI." };
        
        return JSON.parse(text);
    } catch (error) {
        console.error("Gemini Validation Error:", error);
        return { score: 0, feedback: "AI Service Unavailable." };
    }
}