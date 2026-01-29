

import { GoogleGenAI, Type } from "@google/genai";
import { OnboardingAnswers, JournalEntry, UserProfile, Goal, Language } from "../types";

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Sends a chat message with advanced tools support.
 */
// FIX: Update sendChatMessage to return an object with text and grounding chunks.
export const sendChatMessage = async (history: { role: string, parts: { text: string }[] }[], newMessage: string) => {
  const ai = getAIClient();
  const chat = ai.chats.create({ 
    model: 'gemini-3-pro-preview', 
    history: history,
    config: { 
      systemInstruction: `
        Eres un Coach de Propósito experto en el modelo PERMA. 
        INSTRUCCIONES CLAVE:
        1. Eres cálido, empático y profesional.
        2. Si el usuario te pide planes (ejercicio, estudio, dieta), responde con una estructura clara mencionando los días de la semana (Lunes, Martes, etc.) para que la interfaz pueda renderizar un Canvas interactivo.
        3. Tienes acceso a Google Search para noticias o recursos y a Google Maps para lugares.
        4. No uses asteriscos (*) ni negritas (**). Usa texto plano o saltos de línea.
        5. Mantén tus respuestas en el idioma del usuario.
        6. Si detectas una necesidad de geolocalización, sugiere lugares específicos.
      `,
      tools: [{ googleSearch: {} }]
    }
  });
  
  const result = await chat.sendMessage({ message: newMessage });
  return {
    text: result.text?.replace(/\*/g, ''),
    chunks: result.candidates?.[0]?.groundingMetadata?.groundingChunks,
  };
};

export const generateJournalIntro = async (purpose: string, activeGoals: Goal[], lang: Language = 'es'): Promise<string> => {
  const ai = getAIClient();
  const goalsText = activeGoals.map(g => g.title).join(', ');
  const langStr = lang === 'es' ? 'Spanish' : lang === 'en' ? 'English' : lang === 'fr' ? 'French' : 'Italian';
  
  const prompt = `
    Generate a short, warm greeting (max 20 words) for a daily journal.
    Purpose: "${purpose}"
    Goals: "${goalsText}"
    Language: ${langStr}.
    IMPORTANT: No asterisks (*), no bold, no lists. Plain text only.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return response.text?.replace(/\*/g, '').trim() || "Hola. Es un buen momento para escribir.";
};

export const analyzePurpose = async (answers: OnboardingAnswers, lang: Language = 'es'): Promise<{ detailedAnalysis: string, shortStatement: string }> => {
  const ai = getAIClient();
  const prompt = `Define life purpose from this data: ${JSON.stringify(answers)}. No asterisks. Language: ${lang}.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          detailedAnalysis: { type: Type.STRING },
          shortStatement: { type: Type.STRING },
        },
        required: ["detailedAnalysis", "shortStatement"],
      }
    }
  });

  const text = response.text || "{}";
  const data = JSON.parse(text);
  return {
    detailedAnalysis: (data.detailedAnalysis || "").replace(/\*/g, ''),
    shortStatement: (data.shortStatement || "").replace(/\*/g, '')
  };
};

export const analyzeSentiment = async (text: string, lang: Language = 'es'): Promise<{ sentiment: string, summary: string, breakdown: { emotion: string, percentage: number }[] }> => {
  const ai = getAIClient();
  const prompt = `Analyze sentiment of this entry: "${text}". No asterisks. Language: ${lang}.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sentiment: { type: Type.STRING },
          summary: { type: Type.STRING },
          breakdown: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    emotion: { type: Type.STRING },
                    percentage: { type: Type.NUMBER }
                }
            }
          }
        },
        required: ["sentiment", "summary", "breakdown"],
      }
    }
  });

  const resText = response.text || "{}";
  const data = JSON.parse(resText);
  return {
    ...data,
    summary: (data.summary || "").replace(/\*/g, '')
  };
};

export const generateJournalPrompt = async (purpose: string, scope: string, lang: Language = 'es'): Promise<{ options: string[] }> => {
  const ai = getAIClient();
  const langStr = lang === 'es' ? 'Spanish' : lang === 'en' ? 'English' : lang === 'fr' ? 'French' : 'Italian';
  
  const prompt = `
    Generate 3 different journaling questions for a specific life area.
    Area: ${scope}
    User Purpose: ${purpose}
    
    Rules:
    - Questions must be deeply related to the PERMA model (Meaning, Accomplishment, etc.).
    - Maximum 15 words per question.
    - Questions must be diverse (one about challenges, one about gratitude, one about growth).
    
    Language: ${langStr}. No asterisks (*). Return JSON with an array named "options".
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["options"]
      }
    }
  });

  const text = response.text || "{}";
  const data = JSON.parse(text);
  return {
    options: (data.options || []).map((o: string) => o.replace(/\*/g, ''))
  };
};

export const generateGoalSuggestions = async (user: UserProfile, entries: JournalEntry[], lang: Language = 'es'): Promise<Omit<Goal, 'id' | 'createdAt' | 'status' | 'isAiGenerated'>[]> => {
  const ai = getAIClient();
  const prompt = `Generate 3 PERMA goals for user with purpose: ${user.purposeAnalysis}. No asterisks. Language: ${lang}.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                term: { type: Type.STRING, enum: ["short-term", "long-term"] },
                domain: { type: Type.STRING, enum: ["personal", "family", "professional"] }
            },
            required: ["title", "description", "term", "domain"]
        }
      }
    }
  });

  const text = response.text || "[]";
  const data = JSON.parse(text);
  return data.map((g: any) => ({
    ...g,
    title: g.title.replace(/\*/g, ''),
    description: g.description.replace(/\*/g, '')
  }));
}

export const generatePermaTips = async (purpose: string, activeGoals: Goal[], lang: Language = 'es'): Promise<{ tips: string[], motivation: string }> => {
  const ai = getAIClient();
  const prompt = `Provide 3 short PERMA tips and 1 mantra for: ${purpose}. No asterisks. Language: ${lang}.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tips: { type: Type.ARRAY, items: { type: Type.STRING } },
          motivation: { type: Type.STRING }
        },
        required: ["tips", "motivation"]
      }
    }
  });

  const text = response.text || "{}";
  const data = JSON.parse(text);
  return {
    tips: (data.tips || []).map((t: string) => t.replace(/\*/g, '')),
    motivation: (data.motivation || "").replace(/\*/g, '')
  };
};

export const searchResources = async (query: string) => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Find resources for: ${query}. No asterisks.`,
    config: { tools: [{ googleSearch: {} }] },
  });
  return { text: response.text?.replace(/\*/g, ''), chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks };
};

export const findPlaces = async (query: string, location?: { lat: number, lng: number }) => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Places for: ${query}. No asterisks.`,
    config: { 
      tools: [{ googleMaps: {} }],
      toolConfig: { retrievalConfig: { latLng: { latitude: location?.lat || 37.78193, longitude: location?.lng || -122.40476 } } }
    }
  });
  return { text: response.text?.replace(/\*/g, ''), chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks };
};