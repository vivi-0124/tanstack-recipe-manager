import { GoogleGenAI } from '@google/genai'

interface ExtractedRecipe {
  title: string
  description?: string
  servings?: number
  prepTime?: number
  cookTime?: number
  instructions?: string
  ingredients?: Array<{
    name: string
    quantity?: string
    unit?: string
  }>
}

const RECIPE_EXTRACTION_SCHEMA = {
  type: 'object' as const,
  properties: {
    title: {
      type: 'string' as const,
      description: 'The recipe title',
    },
    description: {
      type: 'string' as const,
      description: 'A brief description or summary of the recipe',
    },
    servings: {
      type: 'number' as const,
      description: 'Number of servings this recipe makes',
    },
    prepTime: {
      type: 'number' as const,
      description: 'Preparation time in minutes',
    },
    cookTime: {
      type: 'number' as const,
      description: 'Cooking time in minutes',
    },
    instructions: {
      type: 'string' as const,
      description:
        'Step-by-step cooking instructions as a numbered list in plain text',
    },
    ingredients: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          name: { type: 'string' as const, description: 'Ingredient name' },
          quantity: {
            type: 'string' as const,
            description: 'Amount needed (e.g. "2", "1/2")',
          },
          unit: {
            type: 'string' as const,
            description: 'Unit of measurement (e.g. "cups", "tbsp", "g")',
          },
        },
        required: ['name'],
      },
      description: 'List of ingredients with quantities and units',
    },
  },
  required: ['title'],
}

/**
 * Extract structured recipe data from text content (transcript, description, etc.)
 * using Google Gemini AI.
 */
export const extractRecipeWithGemini = async (
  content: string,
  context: { videoTitle?: string | null; sourceUrl: string },
): Promise<ExtractedRecipe> => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const ai = new GoogleGenAI({ apiKey })

  const prompt = `You are a recipe extraction assistant. Extract structured recipe data from the following content.
The content is from a cooking video${context.videoTitle ? ` titled "${context.videoTitle}"` : ''} (source: ${context.sourceUrl}).
It may be a transcript of someone speaking, a video description, or both.
Extract as much recipe information as possible including title, description, servings, prep time, cook time, step-by-step instructions, and ingredients with quantities and units.
If the content is in Japanese, keep the extracted data in Japanese.
If certain information is not mentioned, omit that field.
For the instructions field, output each step on its own line, prefixed with a number and period (e.g. "1. Step one\\n2. Step two\\n3. Step three").

Content:
${content}`

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: RECIPE_EXTRACTION_SCHEMA,
    },
  })

  const text = response.text
  if (!text) {
    throw new Error('Gemini returned empty response')
  }

  const parsed = JSON.parse(text) as ExtractedRecipe
  return parsed
}
