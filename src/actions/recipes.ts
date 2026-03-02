import Firecrawl from '@mendable/firecrawl-js'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { db } from '../db/index'
import { recipeIngredients, recipes } from '../db/schemas/app'
import { auth } from '../lib/auth'
import { extractRecipeWithGemini } from '../lib/gemini'
import { fetchYouTubeVideoInfo, isYouTubeUrl } from '../lib/youtube'

const ingredientInputSchema = z.object({
  name: z.string().min(1),
  quantity: z.string().optional(),
  unit: z.string().optional(),
})

const createRecipeInputSchema = z.object({
  title: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  description: z.string().optional(),
  servings: z.number().int().positive().optional(),
  prepTime: z.number().int().nonnegative().optional(),
  cookTime: z.number().int().nonnegative().optional(),
  instructions: z.string().optional(),
  memo: z.string().optional(),
  ingredients: z.array(ingredientInputSchema).optional(),
})

/**
 * Server function to manually create a new recipe.
 */
export const createRecipe = createServerFn({ method: 'POST' })
  .inputValidator(createRecipeInputSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      throw new Error('Unauthorized')
    }

    try {
      const recipeId = nanoid()
      await db.insert(recipes).values({
        id: recipeId,
        userId: session.user.id,
        title: data.title,
        sourceUrl: data.sourceUrl ?? null,
        description: data.description ?? null,
        servings: data.servings ?? null,
        prepTime: data.prepTime ?? null,
        cookTime: data.cookTime ?? null,
        instructions: data.instructions ?? null,
        memo: data.memo ?? null,
        isFavorite: false,
      })

      const ingredientsList = data.ingredients ?? []
      if (ingredientsList.length > 0) {
        await db.insert(recipeIngredients).values(
          ingredientsList.map((ing, idx) => ({
            id: nanoid(),
            recipeId,
            name: ing.name,
            quantity: ing.quantity ?? null,
            unit: ing.unit ?? null,
            sortOrder: idx,
          })),
        )
      }

      return { success: true, recipeId }
    } catch (error) {
      console.error('Create recipe error:', error)
      throw new Error('Failed to create recipe')
    }
  })

/** Schema for recipe data extracted by Firecrawl */
const recipeExtractionSchema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'The recipe title',
    },
    description: {
      type: 'string',
      description: 'A brief description or summary of the recipe',
    },
    servings: {
      type: 'number',
      description: 'Number of servings this recipe makes',
    },
    prepTime: {
      type: 'number',
      description: 'Preparation time in minutes',
    },
    cookTime: {
      type: 'number',
      description: 'Cooking time in minutes',
    },
    instructions: {
      type: 'string',
      description:
        'Step-by-step cooking instructions. Each step must be on its own line, prefixed with a number and period (e.g. "1. Step one\\n2. Step two\\n3. Step three")',
    },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Ingredient name' },
          quantity: {
            type: 'string',
            description: 'Amount needed (e.g. "2", "1/2")',
          },
          unit: {
            type: 'string',
            description: 'Unit of measurement (e.g. "cups", "tbsp", "g")',
          },
        },
        required: ['name'],
      },
      description: 'List of ingredients with quantities and units',
    },
  },
  required: ['title'],
} as const

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

/**
 * Extract recipe data from a website using Firecrawl.
 */
const extractFromWebsite = async (url: string): Promise<ExtractedRecipe> => {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY is not configured')
  }

  const firecrawl = new Firecrawl({ apiKey })

  // Firecrawlでページをスクレイピングし、レシピデータを構造化抽出
  const scrapeResult = await firecrawl.scrape(url, {
    formats: [
      {
        type: 'json',
        schema: recipeExtractionSchema,
      },
    ],
  })

  return (scrapeResult.json ?? {}) as ExtractedRecipe
}

/**
 * Extract recipe data from a YouTube video using transcript + Gemini AI.
 */
const extractFromYouTube = async (url: string): Promise<ExtractedRecipe> => {
  const videoInfo = await fetchYouTubeVideoInfo(url)

  // 字幕と説明欄を結合してGeminiに渡す
  const parts: string[] = []
  if (videoInfo.transcript) {
    parts.push(`[Transcript]\n${videoInfo.transcript}`)
  }
  if (videoInfo.description) {
    parts.push(`[Video Description]\n${videoInfo.description}`)
  }
  const content = parts.join('\n\n')

  return extractRecipeWithGemini(content, {
    videoTitle: videoInfo.title,
    sourceUrl: url,
  })
}

/**
 * Server function to import a recipe from a URL.
 * Supports both regular websites (via Firecrawl) and YouTube videos (via transcript + Gemini).
 */
export const importRecipe = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ url: z.string().url() }))
  .handler(async ({ data: { url } }) => {
    const request = getRequest()
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      throw new Error('Unauthorized')
    }

    try {
      // URL種別に応じて抽出方法を切り替え
      const extracted = isYouTubeUrl(url)
        ? await extractFromYouTube(url)
        : await extractFromWebsite(url)

      const recipeId = nanoid()
      await db.insert(recipes).values({
        id: recipeId,
        userId: session.user.id,
        title: extracted.title || `Imported from ${new URL(url).hostname}`,
        sourceUrl: url,
        description: extracted.description ?? null,
        servings: extracted.servings ?? null,
        prepTime: extracted.prepTime ?? null,
        cookTime: extracted.cookTime ?? null,
        instructions: extracted.instructions ?? null,
        isFavorite: false,
      })

      // 抽出された材料をrecipeIngredientsテーブルに保存
      const ingredientsList = extracted.ingredients ?? []
      if (ingredientsList.length > 0) {
        await db.insert(recipeIngredients).values(
          ingredientsList.map((ing, idx) => ({
            id: nanoid(),
            recipeId,
            name: ing.name,
            quantity: ing.quantity ?? null,
            unit: ing.unit ?? null,
            sortOrder: idx,
          })),
        )
      }

      return {
        success: true,
        recipeId,
      }
    } catch (error) {
      console.error('Import error:', error)
      const message =
        error instanceof Error ? error.message : 'Failed to import recipe'
      throw new Error(message)
    }
  })

const updateRecipeInputSchema = z.object({
  recipeId: z.string().min(1),
  title: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  description: z.string().optional(),
  servings: z.number().int().positive().optional(),
  prepTime: z.number().int().nonnegative().optional(),
  cookTime: z.number().int().nonnegative().optional(),
  instructions: z.string().optional(),
  memo: z.string().optional(),
  ingredients: z.array(ingredientInputSchema).optional(),
})

/**
 * Server function to update an existing recipe.
 * Replaces all ingredient rows with the provided list.
 */
export const updateRecipe = createServerFn({ method: 'POST' })
  .inputValidator(updateRecipeInputSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      throw new Error('Unauthorized')
    }

    try {
      // 所有者チェック
      const [existing] = await db
        .select({ userId: recipes.userId })
        .from(recipes)
        .where(eq(recipes.id, data.recipeId))
        .limit(1)

      if (!existing || existing.userId !== session.user.id) {
        throw new Error('Recipe not found')
      }

      await db
        .update(recipes)
        .set({
          title: data.title,
          sourceUrl: data.sourceUrl ?? null,
          description: data.description ?? null,
          servings: data.servings ?? null,
          prepTime: data.prepTime ?? null,
          cookTime: data.cookTime ?? null,
          instructions: data.instructions ?? null,
          memo: data.memo ?? null,
        })
        .where(eq(recipes.id, data.recipeId))

      // 既存の材料を全削除して新しいリストで置き換え
      await db
        .delete(recipeIngredients)
        .where(eq(recipeIngredients.recipeId, data.recipeId))

      const ingredientsList = data.ingredients ?? []
      if (ingredientsList.length > 0) {
        await db.insert(recipeIngredients).values(
          ingredientsList.map((ing, idx) => ({
            id: nanoid(),
            recipeId: data.recipeId,
            name: ing.name,
            quantity: ing.quantity ?? null,
            unit: ing.unit ?? null,
            sortOrder: idx,
          })),
        )
      }

      return { success: true }
    } catch (error) {
      console.error('Update recipe error:', error)
      throw new Error('Failed to update recipe')
    }
  })

/**
 * Server function to delete a recipe owned by the current user.
 */
export const deleteRecipe = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ recipeId: z.string().min(1) }))
  .handler(async ({ data: { recipeId } }) => {
    const request = getRequest()
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      throw new Error('Unauthorized')
    }

    try {
      // 所有者チェック付き削除
      await db
        .delete(recipes)
        .where(
          and(eq(recipes.id, recipeId), eq(recipes.userId, session.user.id)),
        )

      return { success: true }
    } catch (error) {
      console.error('Delete recipe error:', error)
      throw new Error('Failed to delete recipe')
    }
  })
