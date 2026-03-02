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
 * Recipe ingredients table to store ingredient details per recipe.
 */
export const recipeIngredients = sqliteTable(
  'recipe_ingredients',
  {
    id: text('id').primaryKey(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    quantity: text('quantity'),
    unit: text('unit'),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => [index('recipeIngredients_recipeId_idx').on(table.recipeId)],
)

/**
 * Recipe shares table to store share tokens for recipe sharing.
 */
export const recipeShares = sqliteTable(
  'recipe_shares',
  {
    id: text('id').primaryKey(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    shareToken: text('share_token').notNull().unique(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index('recipeShares_shareToken_idx').on(table.shareToken),
    index('recipeShares_recipeId_idx').on(table.recipeId),
  ],
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
export const recipesRelations = relations(recipes, ({ one, many }) => ({
  user: one(user, {
    fields: [recipes.userId],
    references: [user.id],
  }),
  recipeIngredients: many(recipeIngredients),
  shares: many(recipeShares),
}))

export const recipeIngredientsRelations = relations(
  recipeIngredients,
  ({ one }) => ({
    recipe: one(recipes, {
      fields: [recipeIngredients.recipeId],
      references: [recipes.id],
    }),
  }),
)

export const recipeSharesRelations = relations(recipeShares, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeShares.recipeId],
    references: [recipes.id],
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
