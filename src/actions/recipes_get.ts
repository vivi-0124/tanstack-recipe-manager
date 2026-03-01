import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { asc, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index'
import { recipeIngredients, recipes } from '../db/schemas/app'
import { auth } from '../lib/auth'

/**
 * Server function to fetch all recipes for the current user.
 */
export const getMyRecipes = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      throw new Error('Unauthorized')
    }

    try {
      const result = await db
        .select()
        .from(recipes)
        .where(eq(recipes.userId, session.user.id))
        .orderBy(desc(recipes.createdAt))

      return result
    } catch (error) {
      console.error('Fetch recipes error:', error)
      throw new Error('Failed to fetch recipes')
    }
  },
)

/**
 * Server function to fetch a single recipe with its ingredients.
 */
export const getRecipeDetail = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ recipeId: z.string() }))
  .handler(async ({ data: { recipeId } }) => {
    const request = getRequest()
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      throw new Error('Unauthorized')
    }

    try {
      const [recipe] = await db
        .select()
        .from(recipes)
        .where(eq(recipes.id, recipeId))
        .limit(1)

      if (!recipe || recipe.userId !== session.user.id) {
        throw new Error('Recipe not found')
      }

      const ingredientsList = await db
        .select()
        .from(recipeIngredients)
        .where(eq(recipeIngredients.recipeId, recipeId))
        .orderBy(asc(recipeIngredients.sortOrder))

      return { ...recipe, ingredients: ingredientsList }
    } catch (error) {
      console.error('Fetch recipe detail error:', error)
      throw new Error('Failed to fetch recipe detail')
    }
  })
