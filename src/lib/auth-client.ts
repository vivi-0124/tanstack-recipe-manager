import { sentinelClient } from '@better-auth/infra/client'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL,
  plugins: [sentinelClient()],
})

export const { signIn, signUp, signOut, useSession, getSession } = authClient
