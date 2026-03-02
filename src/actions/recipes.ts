import Firecrawl from '@mendable/firecrawl-js'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { db } from '../db/index'
import { recipeIngredients, recipes } from '../db/schemas/app'
import { auth } from '../lib/auth'

const ingredientInputSchema = z.object({
  name: z.string().min(1),
  quantity: z.string().optional(),
  unit: z.string().optional(),
})

const createRecipeInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  servings: z.number().int().positive().optional(),
  prepTime: z.number().int().nonnegative().optional(),
  cookTime: z.number().int().nonnegative().optional(),
  instructions: z.string().optional(),
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
        sourceUrl: null,
        description: data.description ?? null,
        servings: data.servings ?? null,
        prepTime: data.prepTime ?? null,
        cookTime: data.cookTime ?? null,
        instructions: data.instructions ?? null,
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
        'Step-by-step cooking instructions as a numbered list in plain text',
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
 * Server function to fetch and save recipe from a URL using Firecrawl.
 * Scrapes the given URL and extracts structured recipe data.
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

    const apiKey = process.env.FIRECRAWL_API_KEY
    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY is not configured')
    }

    try {
      const firecrawl = new Firecrawl({ apiKey })

      // Firecrawlでページをスクレイピングし、レシピデータを構造化抽出
      // v2 SDKのscrape()は成功時にDocumentを返し、失敗時は例外をスロー
      const scrapeResult = await firecrawl.scrape(url, {
        formats: [
          {
            type: 'json',
            schema: recipeExtractionSchema,
          },
        ],
      })

      const extracted = (scrapeResult.json ?? {}) as ExtractedRecipe

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
  description: z.string().optional(),
  servings: z.number().int().positive().optional(),
  prepTime: z.number().int().nonnegative().optional(),
  cookTime: z.number().int().nonnegative().optional(),
  instructions: z.string().optional(),
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
          description: data.description ?? null,
          servings: data.servings ?? null,
          prepTime: data.prepTime ?? null,
          cookTime: data.cookTime ?? null,
          instructions: data.instructions ?? null,
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
