import { GoogleGenAI } from "@google/genai";
import { Language } from '../types';
import { StorageService } from './storageService';

const getAIClient = () => {
    const settings = StorageService.getSystemSettings();
    // Prioritize the key from Admin Settings. 
    // We avoid accessing process.env directly to prevent browser crashes.
    const key = settings.geminiApiKey || '';
    
    if (!key) {
      console.warn("Gemini API Key is missing. Please add it in Admin Panel > Settings.");
    }

    return new GoogleGenAI({ apiKey: key });
};

export const getTranslationSuggestion = async (sentence: string, targetLanguage: Language): Promise<string> => {
  try {
    const ai = getAIClient();
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
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Rate translation 1-10 and feedback. English: "${original}". ${language.name}: "${translation}". Return JSON { "score": number, "feedback": string }`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || '{}');
    } catch (error) {
        console.error("Gemini Validation Error:", error);
        return { score: 0, feedback: "AI Service Unavailable. Please check your API Key in Settings." };
    }
}