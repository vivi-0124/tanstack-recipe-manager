import { createFileRoute } from '@tanstack/react-router'
import { GoogleLoginButton } from '../components/google-login-button'
import { authClient } from '../lib/auth-client'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const sessionData = authClient.useSession()
  const session = sessionData.data?.session
  const isPending = sessionData.isPending

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold tracking-tight text-center">
        Welcome to TanStack Start
      </h1>
      <p className="mt-4 text-lg text-muted-foreground text-center">
        Your new application is ready for construction.
      </p>

      <div className="mt-8 max-w-sm mx-auto">
        {isPending ? (
          <div className="text-center">Loading...</div>
        ) : session ? (
          <div className="space-y-4 text-center">
            <p className="font-medium text-emerald-600">Logged in</p>
            <button
              onClick={() => authClient.signOut()}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col space-y-2 text-center">
              <h2 className="text-2xl font-semibold tracking-tight">
                Authentication Demo
              </h2>
              <p className="text-sm text-muted-foreground">
                Login with Google to access protected features.
              </p>
            </div>
            <GoogleLoginButton />
          </div>
        )}
      </div>
    </main>
  )
}
