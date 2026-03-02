import { createFileRoute, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  BookOpen,
  Box,
  ChefHat,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  RotateCcw,
  Settings,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import {
  addUnit,
  deleteUnit,
  getMyUnits,
  reorderUnit,
  resetUnits,
} from '../actions/units'
import { GoogleLoginButton } from '../components/google-login-button'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'
import { Empty, EmptyDescription } from '../components/ui/empty'
import { Input } from '../components/ui/input'
import { ScrollArea } from '../components/ui/scroll-area'
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

interface UserUnit {
  id: string
  name: string
  sortOrder: number
}

function UnitSettingsDialog() {
  const [open, setOpen] = useState(false)
  const [units, setUnits] = useState<UserUnit[]>([])
  const [newUnitName, setNewUnitName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const fetchUnits = useServerFn(getMyUnits)
  const addUnitFn = useServerFn(addUnit)
  const deleteUnitFn = useServerFn(deleteUnit)
  const reorderUnitFn = useServerFn(reorderUnit)
  const resetUnitsFn = useServerFn(resetUnits)

  const loadUnits = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await fetchUnits()
      setUnits(
        result.map((u) => ({
          id: u.id,
          name: u.name,
          sortOrder: u.sortOrder,
        })),
      )
    } catch {
      toast.error('単位の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [fetchUnits])

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      loadUnits()
    }
  }

  const handleAdd = async () => {
    const trimmed = newUnitName.trim()
    if (!trimmed) return

    setIsAdding(true)
    try {
      await addUnitFn({ data: { name: trimmed } })
      setNewUnitName('')
      await loadUnits()
      toast.success(`「${trimmed}」を追加しました`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '単位の追加に失敗しました'
      toast.error(message)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (unit: UserUnit) => {
    try {
      await deleteUnitFn({ data: { id: unit.id } })
      setUnits((prev) => prev.filter((u) => u.id !== unit.id))
      toast.success(`「${unit.name}」を削除しました`)
    } catch {
      toast.error('単位の削除に失敗しました')
    }
  }

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    try {
      await reorderUnitFn({ data: { id, direction } })
      await loadUnits()
    } catch {
      toast.error('並び替えに失敗しました')
    }
  }

  const handleReset = async () => {
    try {
      await resetUnitsFn()
      await loadUnits()
      toast.success('デフォルトの単位にリセットしました')
    } catch {
      toast.error('リセットに失敗しました')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0">
          <Settings className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>単位の設定</DialogTitle>
          <DialogDescription>
            単位の追加・削除・並び替えができます。ここで設定した単位が全てのページで候補として表示されます。
          </DialogDescription>
        </DialogHeader>

        {/* 追加フォーム */}
        <div className="flex gap-2">
          <Input
            placeholder="新しい単位を入力..."
            value={newUnitName}
            onChange={(e) => setNewUnitName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAdd()
              }
            }}
            disabled={isAdding}
          />
          <Button
            onClick={handleAdd}
            disabled={isAdding || !newUnitName.trim()}
            size="icon"
            className="shrink-0"
          >
            {isAdding ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
          </Button>
        </div>

        {/* 単位一覧 */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : units.length === 0 ? (
          <Empty className="py-4">
            <EmptyDescription>
              単位がありません。上のフォームから追加してください。
            </EmptyDescription>
          </Empty>
        ) : (
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-1 pr-3">
              {units.map((unit, idx) => (
                <div
                  key={unit.id}
                  className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {unit.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-7"
                      onClick={() => handleReorder(unit.id, 'up')}
                      disabled={idx === 0}
                    >
                      <ChevronUp className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-7"
                      onClick={() => handleReorder(unit.id, 'down')}
                      disabled={idx === units.length - 1}
                    >
                      <ChevronDown className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(unit)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* リセットボタン */}
        <div className="flex justify-end border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            デフォルトに戻す
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

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
          /* ログイン済み: 機能カード + 設定 */
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <UnitSettingsDialog />
            </div>
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
