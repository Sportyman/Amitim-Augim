import { GoogleGenAI, Type } from "@google/genai";

// Aligned API key initialization with guidelines by using process.env.API_KEY directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const findRelatedKeywords = async (term: string): Promise<string[]> => {
  if (!term.trim()) {
    return [];
  }

  try {
    // Updated prompt to align with the responseSchema, ensuring the model returns a JSON object with a 'keywords' key for more reliable parsing.
    const prompt = `For the search term "${term}" on a Hebrew activity finder website, provide related keywords. For example, for "בריכה", suggest "שחייה", "מים", "קאנטרי". Return a JSON object where the key "keywords" is an array of Hebrew keyword strings.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            keywords: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING
              }
            }
          }
        }
      }
    });

    const jsonString = response.text.trim();
    if(jsonString) {
        const result = JSON.parse(jsonString);
        if (result && Array.isArray(result.keywords)) {
            return result.keywords;
        }
    }
    return [];

  } catch (error) {
    console.error("Error fetching related keywords from Gemini API:", error);
    // Graceful degradation: If API fails, return empty array and fall back to simple search.
    return [];
  }
};
