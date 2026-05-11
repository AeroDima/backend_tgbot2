import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('WARNING: GEMINI_API_KEY is not defined. AI estimation will be disabled.');
}

const genAI = new GoogleGenerativeAI(apiKey || '');
const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

export interface MealItem {
  name: string;
  grams: number;
  calories: number;
}

export interface EstimationResult {
  items: MealItem[];
  total_calories: number;
  confidence: number;
}

export async function estimateCalories(mealText: string): Promise<EstimationResult | null> {
  if (!apiKey) return null;

  const prompt = `
    Estimate calories for the following meal description: "${mealText}".
    Return ONLY a JSON object with the following structure:
    {
      "items": [
        { "name": "product name", "grams": number, "calories": number }
      ],
      "total_calories": number,
      "confidence": number (0 to 1)
    }
    If you cannot estimate, return an empty object or a logical error.
    Analyze the language of the description and provide names in that language or English.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up potential markdown formatting from AI response
    const jsonStr = text.replace(/```json|```/g, '').trim();
    
    try {
      const data = JSON.parse(jsonStr);

      // Validation
      if (
        Array.isArray(data.items) &&
        typeof data.total_calories === 'number' &&
        typeof data.confidence === 'number'
      ) {
        return data as EstimationResult;
      }
      
      console.error('AI Response validation failed. Data:', data);
      return null;
    } catch (e) {
      console.error('Failed to parse AI response as JSON. Raw text:', text);
      return null;
    }
  } catch (error) {
    console.error('AI Estimation API Error:', error);
    return null;
  }
}
