import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { user } from './auth'

/**
 * Recipes table to store imported recipe information.
 */
export const recipes = sqliteTable(
  'recipes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    sourceUrl: text('source_url'),
    image: text('image'),
    description: text('description'),
    servings: integer('servings'),
    prepTime: integer('prep_time'), // in minutes
    cookTime: integer('cook_time'), // in minutes
    instructions: text('instructions'), // JSON stringified or markdown
    isFavorite: integer('is_favorite', { mode: 'boolean' })
      .default(false)
      .notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('recipes_userId_idx').on(table.userId)],
)

/**
 * Ingredients table for refrigerator stock management.
 */
export const ingredients = sqliteTable(
  'ingredients',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    quantity: text('quantity'), // Store as text to handle units like "2 pieces", "500g"
    unit: text('unit'),
    category: text('category'),
    expiryDate: integer('expiry_date', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('ingredients_userId_idx').on(table.userId)],
)

/**
 * Shopping lists table.
 */
export const shoppingLists = sqliteTable(
  'shopping_lists',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    recipeId: text('recipe_id').references(() => recipes.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    quantity: text('quantity'),
    unit: text('unit'),
    isPurchased: integer('is_purchased', { mode: 'boolean' })
      .default(false)
      .notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('shoppingLists_userId_idx').on(table.userId)],
)

/**
 * Relations
 */
export const recipesRelations = relations(recipes, ({ one }) => ({
  user: one(user, {
    fields: [recipes.userId],
    references: [user.id],
  }),
}))

export const ingredientsRelations = relations(ingredients, ({ one }) => ({
  user: one(user, {
    fields: [ingredients.userId],
    references: [user.id],
  }),
}))

export const shoppingListsRelations = relations(shoppingLists, ({ one }) => ({
  user: one(user, {
    fields: [shoppingLists.userId],
    references: [user.id],
  }),
  recipe: one(recipes, {
    fields: [shoppingLists.recipeId],
    references: [recipes.id],
  }),
}))
