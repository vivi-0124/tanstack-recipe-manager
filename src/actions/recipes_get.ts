import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '../db/index'
import { recipes } from '../db/schemas/app'
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
