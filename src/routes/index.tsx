import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold tracking-tight">
        Welcome to TanStack Start
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Your new application is ready for construction.
      </p>
    </main>
  )
}
