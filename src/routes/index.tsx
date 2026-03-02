import { createFileRoute, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  BookOpen,
  Box,
  Check,
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
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  getMyUnits,
  resetUnits,
  saveAllUnits,
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
  // DBから取得した元の状態
  const [savedUnits, setSavedUnits] = useState<UserUnit[]>([])
  // ローカル編集中の状態
  const [localUnits, setLocalUnits] = useState<UserUnit[]>([])
  const [newUnitName, setNewUnitName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchUnits = useServerFn(getMyUnits)
  const saveAllUnitsFn = useServerFn(saveAllUnits)
  const resetUnitsFn = useServerFn(resetUnits)

  // 変更があるかどうかを判定
  const isDirty =
    JSON.stringify(savedUnits.map((u) => u.name)) !==
    JSON.stringify(localUnits.map((u) => u.name))

  const loadUnits = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await fetchUnits()
      const mapped = result.map((u) => ({
        id: u.id,
        name: u.name,
        sortOrder: u.sortOrder,
      }))
      setSavedUnits(mapped)
      setLocalUnits(mapped)
    } catch {
      toast.error('単位の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [fetchUnits])

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && isDirty) {
      // 未保存の変更がある場合は破棄して閉じる
      setLocalUnits(savedUnits)
    }
    setOpen(isOpen)
    if (isOpen) {
      setNewUnitName('')
      loadUnits()
    }
  }

  const handleAdd = () => {
    const trimmed = newUnitName.trim()
    if (!trimmed) return

    // ローカルで重複チェック
    if (localUnits.some((u) => u.name === trimmed)) {
      toast.error('この単位は既に存在します')
      return
    }

    const maxOrder = Math.max(-1, ...localUnits.map((u) => u.sortOrder))
    setLocalUnits((prev) => [
      ...prev,
      {
        // ローカル用の一時ID
        id: `local-${Date.now()}`,
        name: trimmed,
        sortOrder: maxOrder + 1,
      },
    ])
    setNewUnitName('')
  }

  const handleDelete = (unit: UserUnit) => {
    setLocalUnits((prev) => prev.filter((u) => u.id !== unit.id))
  }

  const handleReorder = (id: string, direction: 'up' | 'down') => {
    setLocalUnits((prev) => {
      const idx = prev.findIndex((u) => u.id === id)
      if (idx === -1) return prev
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= prev.length) return prev

      const next = [...prev]
      // sortOrderを入れ替え
      const tmpOrder = next[idx].sortOrder
      next[idx] = { ...next[idx], sortOrder: next[swapIdx].sortOrder }
      next[swapIdx] = { ...next[swapIdx], sortOrder: tmpOrder }
      // 配列上の位置も入れ替え
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      return next
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await saveAllUnitsFn({
        data: {
          units: localUnits.map((u, idx) => ({
            name: u.name,
            sortOrder: idx,
          })),
        },
      })
      // 保存成功後、再取得して状態を同期
      const result = await fetchUnits()
      const mapped = result.map((u) => ({
        id: u.id,
        name: u.name,
        sortOrder: u.sortOrder,
      }))
      setSavedUnits(mapped)
      setLocalUnits(mapped)
      toast.success('単位の設定を保存しました')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '保存に失敗しました'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    setIsSaving(true)
    try {
      await resetUnitsFn()
      const result = await fetchUnits()
      const mapped = result.map((u) => ({
        id: u.id,
        name: u.name,
        sortOrder: u.sortOrder,
      }))
      setSavedUnits(mapped)
      setLocalUnits(mapped)
      toast.success('デフォルトの単位にリセットしました')
    } catch {
      toast.error('リセットに失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0">
          <Settings className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>単位の設定</DialogTitle>
          <DialogDescription>
            単位の追加・削除・並び替えができます。ここで設定した単位が全てのページで候補として表示されます。
          </DialogDescription>
        </DialogHeader>

        {/* 追加フォーム */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="新しい単位を入力..."
            value={newUnitName}
            onChange={(e) => setNewUnitName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAdd()
              }
            }}
          />
          <Button
            onClick={handleAdd}
            disabled={!newUnitName.trim()}
            size="icon"
            className="shrink-0"
          >
            <Plus className="size-4" />
          </Button>
        </div>

        {/* 単位一覧 */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : localUnits.length === 0 ? (
          <Empty className="py-4">
            <EmptyDescription>
              単位がありません。上のフォームから追加してください。
            </EmptyDescription>
          </Empty>
        ) : (
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-1 pr-3">
              {localUnits.map((unit, idx) => (
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
                      disabled={idx === localUnits.length - 1}
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

        {/* フッター: リセット + 適用 */}
        <div className="flex items-center justify-between border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isSaving}
            className="gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            デフォルトに戻す
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="gap-1.5"
          >
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            適用
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
