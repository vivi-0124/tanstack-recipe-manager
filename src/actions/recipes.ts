import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { db } from '../db/index'
import { recipes } from '../db/schemas/app'
import { auth } from '../lib/auth'

/**
 * Server function to fetch and save recipe from a URL.
 * Currently uses a mock/simple fetch strategy.
 * In production, integration with Firecrawl or similar is recommended.
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
      // TODO: Implement actual scraping with Firecrawl or similar
      // For now, let's mock a successful import
      const mockRecipe = {
        id: nanoid(),
        userId: session.user.id,
        title: `Imported Recipe from ${new URL(url).hostname}`,
        sourceUrl: url,
        description:
          'This is a placeholder for the imported recipe description.',
        servings: 2,
        prepTime: 10,
        cookTime: 20,
        instructions: '1. Flour\n2. Water\n3. Mix',
        isFavorite: false,
      }

      await db.insert(recipes).values(mockRecipe)

      return { success: true, recipeId: mockRecipe.id }
    } catch (error) {
      console.error('Import error:', error)
      throw new Error('Failed to import recipe')
    }
  })
