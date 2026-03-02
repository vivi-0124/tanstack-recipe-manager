import { Link } from '@tanstack/react-router'
import { BookOpen, Box, Home, ShoppingCart } from 'lucide-react'
import { authClient } from '../lib/auth-client'

const NAV_ITEMS = [
  { to: '/' as const, label: 'ホーム', icon: Home },
  { to: '/recipes' as const, label: 'レシピ', icon: BookOpen },
  { to: '/inventory' as const, label: '在庫', icon: Box },
  { to: '/shopping' as const, label: '買い物', icon: ShoppingCart },
]

/**
 * Bottom navigation bar for mobile devices.
 * Only visible on small screens (below sm breakpoint).
 * Hidden when the user is not logged in.
 */
export function MobileBottomNav() {
  const { data } = authClient.useSession()

  // 未ログイン時はボトムナビを非表示
  if (!data?.session) return null

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/40 bg-background/95 backdrop-blur-sm sm:hidden">
      {/* セーフエリア対応のため padding-bottom を追加 */}
      <div className="grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === '/' }}
            className="flex flex-col items-center gap-0.5 py-2 text-muted-foreground no-underline transition-colors [&.active]:text-primary"
          >
            <Icon className="size-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
