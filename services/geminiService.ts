
import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const findRelatedKeywords = async (term: string): Promise<string[]> => {
  if (!ai) {
    console.warn("Gemini API key not configured. Smart search is disabled.");
    return [];
  }
  
  if (!term.trim()) {
    return [];
  }

  try {
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
    return [];
  }
};

export const scrapeAndStructureData = async (html: string): Promise<string> => {
  if (!ai) {
    throw new Error("Gemini API key not configured. Data scraping is disabled.");
  }

  if (!html.trim()) {
    throw new Error("HTML input is empty.");
  }

  const prompt = `
    Analyze the provided HTML content from a Hebrew website listing activities.
    Extract the details for each activity and structure them into a JSON array of objects.
    Each object should represent one activity and must conform to the following structure:
    - id: A unique number for the activity. Generate this sequentially starting from 1.
    - title: The name of the activity (string).
    - category: The category of the activity (string). Map it to one of the following categories if possible: ספורט, אומנות, מוזיקה, גיל הזהב, העשרה ולימוד, קהילה, טכנולוגיה. Otherwise, use the category found in the HTML.
    - description: A brief summary of the activity (string).
    - imageUrl: The full URL for the activity's image (string). Resolve relative URLs if needed.
    - location: The location, including community center and city, e.g., "מרכז קהילתי נווה ארזים, תל אביב" (string).
    - price: The price of the activity (number). If it's free or not mentioned, use 0.
    - ageGroup: The target age group, e.g., "גילאי 6-8" (string).
    - schedule: The days and times of the activity, e.g., "ימי שני, 17:00-18:00" (string).
    - instructor: The instructor's name (string). If not available, the value should be null.
    - detailsUrl: The full URL to the details page for the activity (string). Resolve relative URLs if needed.

    Return only the raw JSON string. Do not wrap it in markdown backticks or any other text.

    HTML Content to parse:
    ${html}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              description: { type: Type.STRING },
              imageUrl: { type: Type.STRING },
              location: { type: Type.STRING },
              price: { type: Type.NUMBER },
              ageGroup: { type: Type.STRING },
              schedule: { type: Type.STRING },
              instructor: { type: Type.STRING },
              detailsUrl: { type: Type.STRING }
            },
            required: ['id', 'title', 'category', 'description', 'imageUrl', 'location', 'price', 'ageGroup', 'schedule', 'instructor', 'detailsUrl']
          }
        }
      }
    });

    const jsonString = response.text.trim();
    if (jsonString) {
      try {
        JSON.parse(jsonString);
        return jsonString;
      } catch (e) {
        console.error("Gemini API returned invalid JSON:", jsonString);
        throw new Error("Gemini API returned invalid JSON.");
      }
    }
    throw new Error("Received empty response from Gemini API.");

  } catch (error) {
    console.error("Error scraping data with Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to scrape and structure data: ${error.message}`);
    }
    throw new Error("An unknown error occurred during data scraping.");
  }
};