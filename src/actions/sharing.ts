import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { asc, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { db } from '../db/index'
import { recipeIngredients, recipeShares, recipes } from '../db/schemas/app'
import { auth } from '../lib/auth'

/**
 * Server function to create a share link for a recipe.
 * Returns existing token if already shared, otherwise creates a new one.
 */
export const createShareLink = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ recipeId: z.string().min(1) }))
  .handler(async ({ data: { recipeId } }) => {
    const request = getRequest()
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      throw new Error('Unauthorized')
    }

    // 所有者チェック
    const [recipe] = await db
      .select({ userId: recipes.userId })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1)

    if (!recipe || recipe.userId !== session.user.id) {
      throw new Error('Recipe not found')
    }

    // 既存の共有トークンがあればそれを返す
    const [existing] = await db
      .select({ shareToken: recipeShares.shareToken })
      .from(recipeShares)
      .where(eq(recipeShares.recipeId, recipeId))
      .limit(1)

    if (existing) {
      return { shareToken: existing.shareToken }
    }

    // 新しい共有トークンを生成
    const shareToken = nanoid(12)
    await db.insert(recipeShares).values({
      id: nanoid(),
      recipeId,
      shareToken,
    })

    return { shareToken }
  })

/**
 * Server function to fetch a shared recipe by its share token.
 * This is a public endpoint - no authentication required.
 */
export const getSharedRecipe = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data: { token } }) => {
    const [share] = await db
      .select({ recipeId: recipeShares.recipeId })
      .from(recipeShares)
      .where(eq(recipeShares.shareToken, token))
      .limit(1)

    if (!share) {
      throw new Error('Shared recipe not found')
    }

    const [recipe] = await db
      .select()
      .from(recipes)
      .where(eq(recipes.id, share.recipeId))
      .limit(1)

    if (!recipe) {
      throw new Error('Recipe not found')
    }

    const ingredientsList = await db
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, recipe.id))
      .orderBy(asc(recipeIngredients.sortOrder))

    return {
      id: recipe.id,
      title: recipe.title,
      sourceUrl: recipe.sourceUrl,
      description: recipe.description,
      servings: recipe.servings,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      instructions: recipe.instructions,
      ingredients: ingredientsList,
    }
  })

/**
 * Server function to import a shared recipe into the current user's collection.
 * Copies the recipe and its ingredients as a new recipe owned by the user.
 */
export const importSharedRecipe = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data: { token } }) => {
    const request = getRequest()
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      throw new Error('Unauthorized')
    }

    // 共有トークンからレシピを取得
    const [share] = await db
      .select({ recipeId: recipeShares.recipeId })
      .from(recipeShares)
      .where(eq(recipeShares.shareToken, token))
      .limit(1)

    if (!share) {
      throw new Error('Shared recipe not found')
    }

    const [originalRecipe] = await db
      .select()
      .from(recipes)
      .where(eq(recipes.id, share.recipeId))
      .limit(1)

    if (!originalRecipe) {
      throw new Error('Recipe not found')
    }

    // 自分のレシピには追加しない
    if (originalRecipe.userId === session.user.id) {
      throw new Error('Cannot import your own recipe')
    }

    // 元の材料を取得
    const originalIngredients = await db
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, originalRecipe.id))
      .orderBy(asc(recipeIngredients.sortOrder))

    // 新しいレシピとしてコピー
    const newRecipeId = nanoid()
    await db.insert(recipes).values({
      id: newRecipeId,
      userId: session.user.id,
      title: originalRecipe.title,
      sourceUrl: originalRecipe.sourceUrl,
      description: originalRecipe.description,
      servings: originalRecipe.servings,
      prepTime: originalRecipe.prepTime,
      cookTime: originalRecipe.cookTime,
      instructions: originalRecipe.instructions,
      isFavorite: false,
    })

    if (originalIngredients.length > 0) {
      await db.insert(recipeIngredients).values(
        originalIngredients.map((ing, idx) => ({
          id: nanoid(),
          recipeId: newRecipeId,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          sortOrder: idx,
        })),
      )
    }

    return { success: true, recipeId: newRecipeId }
  })

/**
 * Server function to check if the current user is authenticated.
 * Used on the share page to determine whether to show the import button.
 */
export const getSharePageSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    try {
      const request = getRequest()
      const session = await auth.api.getSession({
        headers: request.headers,
      })

      return session
        ? { isAuthenticated: true, userId: session.user.id }
        : { isAuthenticated: false, userId: null }
    } catch {
      return { isAuthenticated: false, userId: null }
    }
  },
)
