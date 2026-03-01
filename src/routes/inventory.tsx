import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { addDays, format, isBefore } from 'date-fns'
import {
  AlertTriangle,
  Box,
  Check,
  Pencil,
  Plus,
  RefreshCcw,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import {
  addIngredient,
  deleteIngredient,
  getMyIngredients,
  updateIngredient,
} from '../actions/ingredients'
import { addShoppingItem } from '../actions/shopping'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { Input } from '../components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'

export const Route = createFileRoute('/inventory')({
  component: InventoryPage,
  loader: async () => {
    const ingredients = await getMyIngredients()
    return { ingredients }
  },
})

interface IngredientFormData {
  name: string
  quantity: string
  unit: string
  expiryDate: string
}

const EMPTY_FORM: IngredientFormData = {
  name: '',
  quantity: '',
  unit: '',
  expiryDate: '',
}

function InventoryPage() {
  const { ingredients } = Route.useLoaderData()
  const navigate = useNavigate()
  const [isAdding, setIsAdding] = useState(false)
  const [formData, setFormData] = useState<IngredientFormData>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<IngredientFormData>(EMPTY_FORM)
  const formId = useId()

  const addFn = useServerFn(addIngredient)
  const updateFn = useServerFn(updateIngredient)
  const deleteFn = useServerFn(deleteIngredient)
  const addToShoppingFn = useServerFn(addShoppingItem)

  const refresh = () => navigate({ to: '/inventory' })

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) return

    setIsAdding(true)
    try {
      const result = await addFn({
        data: {
          ...formData,
          expiryDate: formData.expiryDate
            ? new Date(formData.expiryDate)
            : undefined,
        },
      })

      if (result.success) {
        toast.success('食材を追加しました！')
        setFormData(EMPTY_FORM)
        refresh()
      }
    } catch {
      toast.error('追加に失敗しました。')
    } finally {
      setIsAdding(false)
    }
  }

  const startEdit = (item: (typeof ingredients)[number]) => {
    setEditingId(item.id)
    setEditData({
      name: item.name,
      quantity: item.quantity ?? '',
      unit: item.unit ?? '',
      expiryDate: item.expiryDate
        ? format(new Date(item.expiryDate), 'yyyy-MM-dd')
        : '',
    })
  }

  const handleUpdate = async (id: string) => {
    try {
      const result = await updateFn({
        data: {
          id,
          ...editData,
          expiryDate: editData.expiryDate
            ? new Date(editData.expiryDate)
            : undefined,
        },
      })

      if (result.success) {
        toast.success('食材を更新しました！')
        setEditingId(null)
        refresh()
      }
    } catch {
      toast.error('更新に失敗しました。')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteFn({ data: { id } })
      if (result.success) {
        toast.success('食材を削除しました。')
        refresh()
      }
    } catch {
      toast.error('削除に失敗しました。')
    }
  }

  const handleAddToShopping = async (item: (typeof ingredients)[number]) => {
    try {
      const result = await addToShoppingFn({
        data: {
          name: item.name,
          quantity: item.quantity ?? undefined,
          unit: item.unit ?? undefined,
        },
      })
      if (result.success) {
        toast.success(`「${item.name}」を買い物リストに追加しました！`)
      }
    } catch {
      toast.error('買い物リストへの追加に失敗しました。')
    }
  }

  /**
   * 期限が近いかどうかを判定する（3日以内）
   */
  const isExpiringSoon = (expiryDate: Date | null) => {
    if (!expiryDate) return false
    return isBefore(new Date(expiryDate), addDays(new Date(), 3))
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          在庫管理
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          冷蔵庫の中身を管理しましょう。
        </p>
      </div>

      <Card className="mt-4 border-border/60 sm:mt-6">
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-base">食材を追加</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            新しく購入した食材や使いかけの食材を登録します。
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
          <form
            onSubmit={handleAdd}
            className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 sm:items-end"
          >
            <div className="col-span-2 space-y-1.5 sm:col-span-1 sm:space-y-2">
              <label htmlFor={`${formId}-name`} className="text-sm font-medium">
                名前
              </label>
              <Input
                id={`${formId}-name`}
                placeholder="例: たまご"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="col-span-1 space-y-1.5 sm:space-y-2">
              <label
                htmlFor={`${formId}-quantity`}
                className="text-sm font-medium"
              >
                数量
              </label>
              <div className="flex gap-2">
                <Input
                  id={`${formId}-quantity`}
                  placeholder="10"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  className="flex-1"
                />
                <Input
                  id={`${formId}-unit`}
                  placeholder="個"
                  value={formData.unit}
                  onChange={(e) =>
                    setFormData({ ...formData, unit: e.target.value })
                  }
                  className="w-16 sm:w-20"
                />
              </div>
            </div>
            <div className="col-span-1 space-y-1.5 sm:space-y-2">
              <label
                htmlFor={`${formId}-expiry`}
                className="text-sm font-medium"
              >
                期限
              </label>
              <Input
                id={`${formId}-expiry`}
                type="date"
                value={formData.expiryDate}
                onChange={(e) =>
                  setFormData({ ...formData, expiryDate: e.target.value })
                }
              />
            </div>
            <Button
              type="submit"
              disabled={isAdding}
              className="col-span-2 w-full sm:col-span-1"
            >
              {isAdding ? (
                <RefreshCcw className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              追加する
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* デスクトップ: テーブル表示 */}
      <div className="mt-6 hidden overflow-hidden rounded-xl border border-border/60 bg-background sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>食材名</TableHead>
              <TableHead>数量</TableHead>
              <TableHead>期限</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ingredients.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  在庫がありません。新しい食材を追加してください。
                </TableCell>
              </TableRow>
            ) : (
              ingredients.map((item) => (
                <TableRow key={item.id}>
                  {editingId === item.id ? (
                    <>
                      <TableCell>
                        <Input
                          value={editData.name}
                          onChange={(e) =>
                            setEditData({ ...editData, name: e.target.value })
                          }
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Input
                            value={editData.quantity}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                quantity: e.target.value,
                              })
                            }
                            className="h-8 w-16"
                          />
                          <Input
                            value={editData.unit}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                unit: e.target.value,
                              })
                            }
                            className="h-8 w-16"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={editData.expiryDate}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              expiryDate: e.target.value,
                            })
                          }
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdate(item.id)}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell>
                        {item.expiryDate ? (
                          <span
                            className={
                              isExpiringSoon(item.expiryDate)
                                ? 'text-destructive font-medium flex items-center gap-1'
                                : ''
                            }
                          >
                            {isExpiringSoon(item.expiryDate) && (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            {format(new Date(item.expiryDate), 'yyyy/MM/dd')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(item)}
                            title="編集"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddToShopping(item)}
                            title="買い物リストに追加"
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            title="削除"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* モバイル: カード表示 */}
      <div className="mt-4 space-y-2 sm:hidden">
        {ingredients.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 py-12">
            <Box className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              在庫がありません。食材を追加してください。
            </p>
          </div>
        ) : (
          ingredients.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-border/60 bg-background p-3"
            >
              {editingId === item.id ? (
                <div className="space-y-3">
                  <Input
                    value={editData.name}
                    onChange={(e) =>
                      setEditData({ ...editData, name: e.target.value })
                    }
                    placeholder="食材名"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      value={editData.quantity}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          quantity: e.target.value,
                        })
                      }
                      placeholder="数量"
                    />
                    <Input
                      value={editData.unit}
                      onChange={(e) =>
                        setEditData({ ...editData, unit: e.target.value })
                      }
                      placeholder="単位"
                    />
                    <Input
                      type="date"
                      value={editData.expiryDate}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          expiryDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleUpdate(item.id)}
                    >
                      <Check className="size-4" />
                      保存
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="size-4" />
                      キャンセル
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {(item.quantity || item.unit) && (
                        <span className="rounded-full bg-muted px-2 py-0.5">
                          {item.quantity} {item.unit}
                        </span>
                      )}
                      {item.expiryDate && (
                        <span
                          className={
                            isExpiringSoon(item.expiryDate)
                              ? 'flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive'
                              : 'rounded-full bg-muted px-2 py-0.5'
                          }
                        >
                          {isExpiringSoon(item.expiryDate) && (
                            <AlertTriangle className="size-3" />
                          )}
                          {format(new Date(item.expiryDate), 'MM/dd')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => startEdit(item)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleAddToShopping(item)}
                    >
                      <ShoppingCart className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
