import { Link, useRouter } from '@tanstack/react-router'
import {
  BookOpen,
  Box,
  ChefHat,
  LogOut,
  ShoppingCart,
  User,
} from 'lucide-react'
import { authClient } from '../lib/auth-client'
import { Button } from './ui/button'

const NAV_ITEMS = [
  { to: '/recipes' as const, label: 'レシピ', icon: BookOpen },
  { to: '/inventory' as const, label: '在庫管理', icon: Box },
  { to: '/shopping' as const, label: '買い物リスト', icon: ShoppingCart },
]

/**
 * Application navigation bar displayed when the user is logged in.
 */
export function AppNavbar() {
  const sessionData = authClient.useSession()
  const session = sessionData.data?.session
  const user = sessionData.data?.user
  const router = useRouter()

  if (!session) return null

  const handleSignOut = async () => {
    await authClient.signOut()
    router.navigate({ to: '/' })
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-12 items-center gap-4 px-4 sm:h-14 sm:px-6 lg:px-8">
        {/* ロゴ */}
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 font-bold text-lg text-foreground no-underline"
        >
          <ChefHat className="size-5 text-primary" />
          <span className="hidden sm:inline">Recipe Manager</span>
        </Link>

        {/* ナビゲーション — モバイルではボトムナビに委譲 */}
        <nav className="hidden flex-1 items-center gap-1 sm:flex">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground no-underline transition-colors hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {/* モバイル用スペーサー */}
        <div className="flex-1 sm:hidden" />

        {/* ユーザー情報 */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground sm:flex">
            <User className="size-3.5" />
            <span className="max-w-30 truncate">{user?.name}</span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="size-4" />
            <span className="sr-only">ログアウト</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
