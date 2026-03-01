import { createFileRoute, Link } from '@tanstack/react-router'
import { BookOpen, Box, ChefHat, ShoppingCart } from 'lucide-react'
import { GoogleLoginButton } from '../components/google-login-button'
import { authClient } from '../lib/auth-client'

export const Route = createFileRoute('/')({
  component: Home,
})

const FEATURES = [
  {
    to: '/recipes' as const,
    icon: BookOpen,
    title: 'レシピ管理',
    description: 'URLからレシピを自動インポートし、材料と手順を整理。',
  },
  {
    to: '/inventory' as const,
    icon: Box,
    title: '在庫管理',
    description: '食材の在庫と賞味期限を管理して、無駄をなくす。',
  },
  {
    to: '/shopping' as const,
    icon: ShoppingCart,
    title: '買い物リスト',
    description: '足りない食材をリストアップして、買い忘れを防止。',
  },
]

function Home() {
  const sessionData = authClient.useSession()
  const session = sessionData.data?.session
  const isPending = sessionData.isPending

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* ヒーロー */}
      <div className="flex flex-col items-center gap-3 text-center sm:gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 sm:size-16">
          <ChefHat className="size-7 text-primary sm:size-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
          Recipe Manager
        </h1>
        <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
          レシピの管理、食材の在庫管理、買い物リストをひとつのアプリで。
        </p>
      </div>

      <div className="mt-8 sm:mt-12">
        {isPending ? (
          <div className="flex justify-center py-12">
            <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
        ) : session ? (
          /* ログイン済み: 機能カード */
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            {FEATURES.map(({ to, icon: Icon, title, description }) => (
              <Link
                key={to}
                to={to}
                className="group flex flex-row items-center gap-4 rounded-xl border border-border/60 bg-card p-4 no-underline shadow-sm transition-all active:bg-accent/50 sm:flex-col sm:items-start sm:gap-3 sm:p-6 sm:hover:border-border sm:hover:shadow-md"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <Icon className="size-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-card-foreground">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* 未ログイン: ログインフォーム */
          <div className="mx-auto max-w-sm">
            <div className="rounded-xl border border-border/60 bg-card p-8 shadow-sm">
              <div className="flex flex-col gap-2 text-center">
                <h2 className="text-xl font-semibold tracking-tight">
                  はじめましょう
                </h2>
                <p className="text-sm text-muted-foreground">
                  Googleアカウントでログインして、すべての機能にアクセスしましょう。
                </p>
              </div>
              <div className="mt-6">
                <GoogleLoginButton />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
