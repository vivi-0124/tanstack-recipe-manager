import { dash } from '@better-auth/infra'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '../db/index'
import * as schema from '../db/schemas/auth'

// サーバーサイドでのみ実行されるため、環境変数が未定義の場合はエラーを投げる
const betterAuthUrl = process.env.BETTER_AUTH_URL
const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

if (!betterAuthUrl || !googleClientId || !googleClientSecret) {
  throw new Error(
    'Missing required environment variables: BETTER_AUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET',
  )
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema,
  }),
  baseURL: betterAuthUrl,
  socialProviders: {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    },
  },
  plugins: [dash(), tanstackStartCookies()],
})
