import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, desc, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { db } from '../db/index'
import { ingredients } from '../db/schemas/app'
import { auth } from '../lib/auth'

const ingredientSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  category: z.string().optional(),
  expiryDate: z.preprocess((arg) => {
    if (typeof arg === 'string' || arg instanceof Date) return new Date(arg)
  }, z.date().optional()),
})

/**
 * Helper to get the authenticated session or throw.
 */
async function requireSession() {
  const request = getRequest()
  const session = await auth.api.getSession({
    headers: request.headers,
  })
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

/**
 * Server function to add a new ingredient to inventory.
 */
export const addIngredient = createServerFn({ method: 'POST' })
  .inputValidator(ingredientSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()

    try {
      const id = nanoid()
      await db.insert(ingredients).values({
        id,
        userId: session.user.id,
        ...data,
      })

      return { success: true, id }
    } catch (error) {
      console.error('Add ingredient error:', error)
      throw new Error('Failed to add ingredient')
    }
  })

/**
 * Server function to update an existing ingredient.
 */
export const updateIngredient = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string(),
      name: z.string().min(1),
      quantity: z.string().optional(),
      unit: z.string().optional(),
      category: z.string().optional(),
      expiryDate: z.preprocess((arg) => {
        if (typeof arg === 'string' || arg instanceof Date) return new Date(arg)
      }, z.date().optional()),
    }),
  )
  .handler(async ({ data: { id, ...rest } }) => {
    const session = await requireSession()

    try {
      await db
        .update(ingredients)
        .set(rest)
        .where(
          and(eq(ingredients.id, id), eq(ingredients.userId, session.user.id)),
        )

      return { success: true }
    } catch (error) {
      console.error('Update ingredient error:', error)
      throw new Error('Failed to update ingredient')
    }
  })

/**
 * Server function to delete an ingredient.
 */
export const deleteIngredient = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data: { id } }) => {
    const session = await requireSession()

    try {
      await db
        .delete(ingredients)
        .where(
          and(eq(ingredients.id, id), eq(ingredients.userId, session.user.id)),
        )

      return { success: true }
    } catch (error) {
      console.error('Delete ingredient error:', error)
      throw new Error('Failed to delete ingredient')
    }
  })

/**
 * Server function to fetch all ingredients for the current user.
 */
export const getMyIngredients = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await requireSession()

    try {
      const result = await db
        .select()
        .from(ingredients)
        .where(eq(ingredients.userId, session.user.id))
        .orderBy(desc(ingredients.createdAt))

      return result
    } catch (error) {
      console.error('Fetch ingredients error:', error)
      throw new Error('Failed to fetch ingredients')
    }
  },
)
