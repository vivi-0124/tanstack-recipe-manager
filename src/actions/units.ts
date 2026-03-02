import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, asc, eq, max } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { db } from '../db/index'
import { userUnits } from '../db/schemas/app'
import { auth } from '../lib/auth'
import { DEFAULT_UNITS } from '../lib/constants'

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
 * Seed default units for a user who has no units yet.
 */
async function seedDefaultUnits(userId: string) {
  const values = DEFAULT_UNITS.map((name, idx) => ({
    id: nanoid(),
    userId,
    name,
    sortOrder: idx,
  }))
  await db.insert(userUnits).values(values)
  return db
    .select()
    .from(userUnits)
    .where(eq(userUnits.userId, userId))
    .orderBy(asc(userUnits.sortOrder))
}

/**
 * Fetch all custom units for the current user.
 * Seeds default units on first access.
 */
export const getMyUnits = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await requireSession()

    const existing = await db
      .select()
      .from(userUnits)
      .where(eq(userUnits.userId, session.user.id))
      .orderBy(asc(userUnits.sortOrder))

    if (existing.length > 0) {
      return existing
    }

    // 初回アクセス時にデフォルト単位をシード
    return seedDefaultUnits(session.user.id)
  },
)

/**
 * Add a new custom unit.
 */
export const addUnit = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({ name: z.string().min(1, '単位名を入力してください') }),
  )
  .handler(async ({ data }) => {
    const session = await requireSession()
    const trimmed = data.name.trim()

    // 重複チェック
    const duplicate = await db
      .select()
      .from(userUnits)
      .where(
        and(eq(userUnits.userId, session.user.id), eq(userUnits.name, trimmed)),
      )

    if (duplicate.length > 0) {
      throw new Error('この単位は既に存在します')
    }

    // 現在の最大sortOrderを取得
    const [maxResult] = await db
      .select({ maxOrder: max(userUnits.sortOrder) })
      .from(userUnits)
      .where(eq(userUnits.userId, session.user.id))

    const nextOrder = (maxResult?.maxOrder ?? -1) + 1

    const id = nanoid()
    await db.insert(userUnits).values({
      id,
      userId: session.user.id,
      name: trimmed,
      sortOrder: nextOrder,
    })

    return { success: true, id }
  })

/**
 * Delete a custom unit by ID.
 */
export const deleteUnit = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession()

    await db
      .delete(userUnits)
      .where(
        and(eq(userUnits.id, data.id), eq(userUnits.userId, session.user.id)),
      )

    return { success: true }
  })

/**
 * Reorder a unit by swapping with an adjacent unit.
 */
export const reorderUnit = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string(),
      direction: z.enum(['up', 'down']),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireSession()

    const allUnits = await db
      .select()
      .from(userUnits)
      .where(eq(userUnits.userId, session.user.id))
      .orderBy(asc(userUnits.sortOrder))

    const currentIndex = allUnits.findIndex((u) => u.id === data.id)
    if (currentIndex === -1) {
      throw new Error('Unit not found')
    }

    const swapIndex =
      data.direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (swapIndex < 0 || swapIndex >= allUnits.length) {
      // すでに端にいるので何もしない
      return { success: true }
    }

    const current = allUnits[currentIndex]
    const swap = allUnits[swapIndex]

    // sortOrderを入れ替え
    await db
      .update(userUnits)
      .set({ sortOrder: swap.sortOrder })
      .where(eq(userUnits.id, current.id))

    await db
      .update(userUnits)
      .set({ sortOrder: current.sortOrder })
      .where(eq(userUnits.id, swap.id))

    return { success: true }
  })

/**
 * Reset units to defaults by deleting all and re-seeding.
 */
export const resetUnits = createServerFn({ method: 'POST' }).handler(
  async () => {
    const session = await requireSession()

    await db.delete(userUnits).where(eq(userUnits.userId, session.user.id))

    await seedDefaultUnits(session.user.id)

    return { success: true }
  },
)
