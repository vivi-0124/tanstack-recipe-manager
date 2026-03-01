import { createAuthClient } from "better-auth/react";
import { sentinelClient } from "@better-auth/infra/client";

export const authClient = createAuthClient({
    baseURL: process.env.BETTER_AUTH_URL,
    plugins: [
      sentinelClient()
    ]
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;