import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Plus, RefreshCcw, ShoppingCart, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import {
  addShoppingItem,
  deleteShoppingItem,
  getMyShoppingList,
  toggleShoppingItem,
} from '../actions/shopping'
import { Button } from '../components/ui/button'
import { Checkbox } from '../components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'
import { Empty, EmptyDescription, EmptyMedia } from '../components/ui/empty'
import { Input } from '../components/ui/input'
import { UnitChips } from '../components/unit-chips'

export const Route = createFileRoute('/shopping')({
  component: ShoppingPage,
  loader: async () => {
    const items = await getMyShoppingList()
    return { items }
  },
})

function ShoppingPage() {
  const { items } = Route.useLoaderData()
  const navigate = useNavigate()
  const [isAdding, setIsAdding] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: '',
  })
  const formId = useId()

  const addFn = useServerFn(addShoppingItem)
  const toggleFn = useServerFn(toggleShoppingItem)
  const deleteFn = useServerFn(deleteShoppingItem)

  const refresh = () => navigate({ to: '/shopping' })

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) return

    setIsAdding(true)
    try {
      const result = await addFn({ data: formData })
      if (result.success) {
        toast.success('買い物リストに追加しました！')
        setFormData({ name: '', quantity: '', unit: '' })
        setIsDialogOpen(false)
        refresh()
      }
    } catch {
      toast.error('追加に失敗しました。')
    } finally {
      setIsAdding(false)
    }
  }

  const handleToggle = async (id: string, currentState: boolean) => {
    try {
      await toggleFn({ data: { id, isPurchased: !currentState } })
      refresh()
    } catch {
      toast.error('更新に失敗しました。')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteFn({ data: { id } })
      if (result.success) {
        toast.success('削除しました。')
        refresh()
      }
    } catch {
      toast.error('削除に失敗しました。')
    }
  }

  // 未購入と購入済みを分離
  const unpurchased = items.filter((item) => !item.isPurchased)
  const purchased = items.filter((item) => item.isPurchased)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="size-4" />
            アイテムを追加
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>アイテムを追加</DialogTitle>
            <DialogDescription>
              買い物リストに食材を追加します。在庫管理ページからも追加できます。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <div className="space-y-1.5">
              <label htmlFor={`${formId}-name`} className="text-sm font-medium">
                食材名
              </label>
              <Input
                id={`${formId}-name`}
                placeholder="例: 牛乳"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`${formId}-quantity`}
                className="text-sm font-medium"
              >
                数量
              </label>
              <div className="flex gap-2">
                <Input
                  id={`${formId}-quantity`}
                  placeholder="1"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  className="flex-1"
                />
                <Input
                  id={`${formId}-unit`}
                  placeholder="本"
                  value={formData.unit}
                  onChange={(e) =>
                    setFormData({ ...formData, unit: e.target.value })
                  }
                  className="w-20"
                />
              </div>
              <UnitChips
                selectedUnit={formData.unit}
                onSelect={(unit) => setFormData({ ...formData, unit })}
              />
            </div>
            <Button type="submit" disabled={isAdding} className="w-full">
              {isAdding ? (
                <RefreshCcw className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              追加する
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="mt-4 space-y-4 sm:mt-6 sm:space-y-6">
        <div className="space-y-2">
          <h2 className="text-base font-semibold sm:text-lg">
            未購入 ({unpurchased.length})
          </h2>
          {unpurchased.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon">
                <ShoppingCart />
              </EmptyMedia>
              <EmptyDescription>
                買い物リストは空です。素晴らしい!
              </EmptyDescription>
            </Empty>
          ) : (
            <div className="space-y-2">
              {unpurchased.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-background p-3 transition-colors active:bg-accent/50 sm:hover:bg-accent/50"
                >
                  <Checkbox
                    checked={false}
                    onCheckedChange={() =>
                      handleToggle(item.id, item.isPurchased)
                    }
                    className="size-5"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{item.name}</span>
                    {(item.quantity || item.unit) && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        {item.quantity} {item.unit}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {purchased.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-muted-foreground">
              購入済み ({purchased.length})
            </h2>
            <div className="space-y-2">
              {purchased.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/50 p-3 transition-colors"
                >
                  <Checkbox
                    checked
                    onCheckedChange={() =>
                      handleToggle(item.id, item.isPurchased)
                    }
                    className="size-5"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="line-through text-muted-foreground">
                      {item.name}
                    </span>
                    {(item.quantity || item.unit) && (
                      <span className="ml-2 text-sm text-muted-foreground line-through">
                        {item.quantity} {item.unit}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
