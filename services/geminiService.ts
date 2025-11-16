
import { GoogleGenAI } from "@google/genai";

// Ключ вставлен напрямую, чтобы исправить ошибку при деплое на Vercel
const API_KEY = 'AIzaSyDWtpv39WEVxCjv7oPU9HxjBavnaQWlX9I';

if (!API_KEY) {
  // This will be handled by the environment, but as a fallback for local dev.
  console.warn("API_KEY is not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const getSeoAdvice = async (url: string): Promise<string> => {
  try {
    const prompt = `
      As an expert SEO consultant, provide 5 actionable, concise, and impactful SEO tips to improve the indexing and ranking chances for a webpage with the URL: ${url}.
      Focus on on-page SEO elements like title tags, meta descriptions, content structure, internal linking, and mobile-friendliness.
      Present the tips as a clean, bulleted list using markdown. Each tip should be bolded.
      For example:
      - **Optimize Title Tag:** Ensure the title is compelling and includes the primary keyword.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error fetching SEO advice from Gemini:", error);
    return "Failed to get SEO advice. Please check the console for more details. Ensure your API key is configured correctly.";
  }
};
