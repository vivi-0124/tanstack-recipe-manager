import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, desc, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { db } from '../db/index'
import { shoppingLists } from '../db/schemas/app'
import { auth } from '../lib/auth'

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
 * Server function to add an item to the shopping list.
 */
export const addShoppingItem = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      name: z.string().min(1),
      quantity: z.string().optional(),
      unit: z.string().optional(),
      recipeId: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireSession()

    try {
      const id = nanoid()
      await db.insert(shoppingLists).values({
        id,
        userId: session.user.id,
        ...data,
      })

      return { success: true, id }
    } catch (error) {
      console.error('Add shopping item error:', error)
      throw new Error('Failed to add shopping item')
    }
  })

/**
 * Server function to toggle the purchased status of a shopping list item.
 */
export const toggleShoppingItem = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string(),
      isPurchased: z.boolean(),
    }),
  )
  .handler(async ({ data: { id, isPurchased } }) => {
    const session = await requireSession()

    try {
      await db
        .update(shoppingLists)
        .set({ isPurchased })
        .where(
          and(
            eq(shoppingLists.id, id),
            eq(shoppingLists.userId, session.user.id),
          ),
        )

      return { success: true }
    } catch (error) {
      console.error('Toggle shopping item error:', error)
      throw new Error('Failed to toggle shopping item')
    }
  })

/**
 * Server function to delete a shopping list item.
 */
export const deleteShoppingItem = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data: { id } }) => {
    const session = await requireSession()

    try {
      await db
        .delete(shoppingLists)
        .where(
          and(
            eq(shoppingLists.id, id),
            eq(shoppingLists.userId, session.user.id),
          ),
        )

      return { success: true }
    } catch (error) {
      console.error('Delete shopping item error:', error)
      throw new Error('Failed to delete shopping item')
    }
  })

/**
 * Server function to fetch all shopping list items for the current user.
 */
export const getMyShoppingList = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await requireSession()

    try {
      const result = await db
        .select()
        .from(shoppingLists)
        .where(eq(shoppingLists.userId, session.user.id))
        .orderBy(desc(shoppingLists.createdAt))

      return result
    } catch (error) {
      console.error('Fetch shopping list error:', error)
      throw new Error('Failed to fetch shopping list')
    }
  },
)
