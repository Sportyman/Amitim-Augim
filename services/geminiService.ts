
import { GoogleGenAI, Type } from "@google/genai";
import { Activity } from "../types";

// FIX: Safely initialize API key to avoid immediate crash if environment variable is missing or process is undefined.
const getApiKey = () => {
  try {
    return (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;
  } catch (e) {
    return undefined;
  }
};

const apiKey = getApiKey();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const findRelatedKeywords = async (term: string): Promise<string[]> => {
  if (!term.trim()) {
    return [];
  }

  if (!ai) {
      console.warn("Gemini API key is missing. Skipping keyword generation.");
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

    const jsonString = response.text?.trim() || "";
    
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
  if (!html.trim()) {
    throw new Error("HTML input is empty.");
  }
  
  if (!ai) {
      throw new Error("Gemini API key is missing. Cannot process data.");
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

    const jsonString = response.text?.trim() || "";
    
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

export const enrichActivityMetadata = async (activity: Activity): Promise<Partial<Activity>> => {
    if (!ai) return {};

    const prompt = `
    You are a data normalization expert for a Hebrew community center database.
    Analyze the following activity data and return an Enriched Metadata object.
    
    Input Data:
    Title: ${activity.title}
    Description: ${activity.description}
    Age Group Text: ${activity.ageGroup}
    Instructor: ${activity.instructor || 'Not specified'}
    Category: ${activity.category}

    Tasks:
    1. Parse "Age Group Text" into numeric minAge and maxAge.
       IMPORTANT BUSINESS RULES - STRICTLY ENFORCE THESE:
       - "Golden Age", "Third Age", "Pensioners", "גיל הזהב", "גמלאים", "גיל שלישי" -> MUST be min: 66, max: 120.
       - "Adults", "מבוגרים", "נשים", "גברים" -> min: 18, max: 65.
       - "Youth", "Noar", "נוער" -> min: 12, max: 18.
       - "Kids", "Children", "ילדים" -> min: 6, max: 12.
       - "Tots", "Early Childhood", "גיל הרך" -> min: 0, max: 6.
       - "All ages", "Everyone", "לכל המשפחה", "רב גילאי" -> min: 0, max: 120.
       
    2. Extract instructor name if missing from 'Instructor' field but present in 'Description'.
       CRITICAL INSTRUCTOR EXTRACTION RULE:
       - Often, names are concatenated with phone numbers in the Hebrew description (e.g., "נועם054-1234567").
       - You MUST split this. Extract "נועם" as the instructor.
       - Look for patterns like [Hebrew Name][Phone Number] or [Hebrew Name] [Phone Number].
       - Remove the phone number from the extracted name.

    3. Generate 5-8 relevant Hebrew search tags (synonyms, related fields).
    4. Determine specific Gender if mentioned (e.g., "Women only"), otherwise 'mixed'.

    Return JSON only.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        minAge: { type: Type.INTEGER },
                        maxAge: { type: Type.INTEGER },
                        extractedInstructor: { type: Type.STRING, nullable: true },
                        ai_tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                        gender: { type: Type.STRING, enum: ['male', 'female', 'mixed'] },
                        categoryCorrection: { type: Type.STRING, nullable: true }
                    }
                }
            }
        });

        const result = JSON.parse(response.text || "{}");
        
        const updates: Partial<Activity> = {};
        if (typeof result.minAge === 'number') updates.minAge = result.minAge;
        if (typeof result.maxAge === 'number') updates.maxAge = result.maxAge;
        if (result.ai_tags && Array.isArray(result.ai_tags)) updates.ai_tags = result.ai_tags;
        if (result.gender) updates.gender = result.gender;
        
        // Only update instructor if we found one and the original was empty or just a phone number
        if (result.extractedInstructor && (!activity.instructor || activity.instructor.length < 2)) {
            updates.instructor = result.extractedInstructor;
        }

        return updates;

    } catch (error) {
        console.error("Enrichment failed", error);
        return {};
    }
};
