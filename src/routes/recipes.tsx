import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  BookOpen,
  Check,
  ChefHat,
  Clock,
  Copy,
  ExternalLink,
  List,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Share2,
  ShoppingCart,
  StickyNote,
  Trash2,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { useCallback, useId, useState } from 'react'
import { toast } from 'sonner'
import {
  createRecipe,
  deleteRecipe,
  importRecipe,
  updateRecipe,
} from '../actions/recipes'
import { getMyRecipes, getRecipeDetail } from '../actions/recipes_get'
import { createShareLink } from '../actions/sharing'
import { addRecipeToShoppingList, addShoppingItem } from '../actions/shopping'
import { getMyUnits } from '../actions/units'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
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
import { ScrollArea } from '../components/ui/scroll-area'
import { Separator } from '../components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Textarea } from '../components/ui/textarea'
import { toHalfWidth } from '../lib/utils'

export const Route = createFileRoute('/recipes')({
  component: RecipesPage,
  loader: async () => {
    const [recipes, units] = await Promise.all([getMyRecipes(), getMyUnits()])
    return { recipes, units }
  },
})

interface RecipeDetail {
  id: string
  title: string
  sourceUrl: string | null
  description: string | null
  servings: number | null
  prepTime: number | null
  cookTime: number | null
  instructions: string | null
  memo: string | null
  isFavorite: boolean
  ingredients: Array<{
    id: string
    name: string
    quantity: string | null
    unit: string | null
    sortOrder: number
  }>
}

function RecipesPage() {
  const { recipes, units } = Route.useLoaderData()
  const unitNames = units.map((u) => u.name)
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(
    null,
  )
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isAddingToShopping, setIsAddingToShopping] = useState(false)
  const [addingIngredientId, setAddingIngredientId] = useState<string | null>(
    null,
  )
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const importFn = useServerFn(importRecipe)
  const createFn = useServerFn(createRecipe)
  const updateFn = useServerFn(updateRecipe)
  const deleteFn = useServerFn(deleteRecipe)
  const getDetailFn = useServerFn(getRecipeDetail)
  const addToShoppingFn = useServerFn(addRecipeToShoppingList)
  const addItemFn = useServerFn(addShoppingItem)
  const shareFn = useServerFn(createShareLink)

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return

    setIsImporting(true)
    try {
      const result = await importFn({ data: { url } })
      if (result.success) {
        toast.success('レシピをインポートしました！')
        setUrl('')
        setIsDialogOpen(false)
        navigate({ to: '/recipes' })
      }
    } catch (error) {
      toast.error('インポートに失敗しました。')
      console.error(error)
    } finally {
      setIsImporting(false)
    }
  }

  const handleAddToShopping = async (recipeId: string) => {
    setIsAddingToShopping(true)
    try {
      const result = await addToShoppingFn({ data: { recipeId } })
      if (result.success) {
        toast.success(`${result.count}件の材料を買い物リストに追加しました！`)
      }
    } catch {
      toast.error('買い物リストへの追加に失敗しました。')
    } finally {
      setIsAddingToShopping(false)
    }
  }

  const handleAddSingleIngredient = async (ingredient: {
    name: string
    quantity: string | null
    unit: string | null
    id: string
  }) => {
    setAddingIngredientId(ingredient.id)
    try {
      const result = await addItemFn({
        data: {
          name: ingredient.name,
          quantity: ingredient.quantity ?? undefined,
          unit: ingredient.unit ?? undefined,
          recipeId: selectedRecipe?.id,
        },
      })
      if (result.success) {
        toast.success(`「${ingredient.name}」を買い物リストに追加しました！`)
      }
    } catch {
      toast.error('買い物リストへの追加に失敗しました。')
    } finally {
      setAddingIngredientId(null)
    }
  }

  const handleOpenDetail = async (recipeId: string) => {
    setIsDetailOpen(true)
    setIsLoadingDetail(true)
    setIsEditing(false)
    setShareUrl(null)
    setIsCopied(false)
    try {
      const detail = await getDetailFn({ data: { recipeId } })
      setSelectedRecipe(detail as RecipeDetail)
    } catch (error) {
      toast.error('レシピの詳細を取得できませんでした。')
      console.error(error)
      setIsDetailOpen(false)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  /** 詳細を取得して編集モードで開く */
  const handleOpenEdit = async (recipeId: string) => {
    setIsDetailOpen(true)
    setIsLoadingDetail(true)
    setIsEditing(true)
    setShareUrl(null)
    setIsCopied(false)
    try {
      const detail = await getDetailFn({ data: { recipeId } })
      setSelectedRecipe(detail as RecipeDetail)
    } catch (error) {
      toast.error('レシピの詳細を取得できませんでした。')
      console.error(error)
      setIsDetailOpen(false)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  /** カードから直接共有リンクを生成してクリップボードにコピー */
  const handleShareFromCard = async (recipeId: string) => {
    try {
      const result = await shareFn({ data: { recipeId } })
      const url = `${window.location.origin}/share/${result.shareToken}`
      await navigator.clipboard.writeText(url)
      toast.success('共有リンクをコピーしました')
    } catch (error) {
      toast.error('共有リンクの作成に失敗しました。')
      console.error(error)
    }
  }

  const handleDeleteRecipe = async (recipeId: string) => {
    setIsDeleting(true)
    try {
      await deleteFn({ data: { recipeId } })
      toast.success('レシピを削除しました。')
      setIsDetailOpen(false)
      setSelectedRecipe(null)
      navigate({ to: '/recipes' })
    } catch {
      toast.error('レシピの削除に失敗しました。')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="size-4" />
            レシピを追加
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新しいレシピを追加</DialogTitle>
            <DialogDescription>
              URLからインポート、または手動で入力してレシピを追加できます。
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="manual" className="flex-1">
                手動で入力
              </TabsTrigger>
              <TabsTrigger value="import" className="flex-1">
                URLからインポート
              </TabsTrigger>
            </TabsList>
            <TabsContent value="import">
              <form onSubmit={handleImport} className="flex flex-col gap-3">
                <Input
                  type="url"
                  placeholder="https://example.com/recipe/... or YouTube URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  disabled={isImporting}
                />
                <p className="text-xs text-muted-foreground">
                  レシピサイトのURLまたはYouTube動画のURLを入力してください。
                  YouTube動画の場合は字幕と説明欄からレシピを抽出します。
                </p>
                <Button type="submit" disabled={isImporting} className="w-full">
                  {isImporting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  {isImporting ? 'インポート中...' : 'インポート'}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="manual">
              <RecipeForm
                mode="create"
                unitNames={unitNames}
                onSubmit={async (data) => {
                  try {
                    const result = await createFn({ data })
                    if (result.success) {
                      toast.success('レシピを追加しました！')
                      setIsDialogOpen(false)
                      navigate({ to: '/recipes' })
                    }
                  } catch (error) {
                    toast.error('レシピの追加に失敗しました。')
                    console.error(error)
                  }
                }}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {recipes.length === 0 ? (
          <Empty className="col-span-full">
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyDescription>
              レシピがまだありません。上のフォームからインポートしましょう!
            </EmptyDescription>
          </Empty>
        ) : (
          recipes.map((recipe) => (
            <Card
              key={recipe.id}
              className="flex cursor-pointer flex-col overflow-hidden border-border/60 transition-shadow hover:shadow-md"
              onClick={() => handleOpenDetail(recipe.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="line-clamp-2 text-base">
                  {recipe.title}
                </CardTitle>
                <CardDescription>
                  <div className="flex flex-wrap items-center gap-2">
                    {(recipe.prepTime != null || recipe.cookTime != null) && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Clock className="size-3" />
                        {recipe.prepTime != null && recipe.cookTime != null
                          ? `${recipe.prepTime + recipe.cookTime}分`
                          : recipe.prepTime != null
                            ? `準備${recipe.prepTime}分`
                            : `調理${recipe.cookTime}分`}
                      </Badge>
                    )}
                    {recipe.servings != null && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Users className="size-3" />
                        {recipe.servings}人分
                      </Badge>
                    )}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col pt-0">
                <p className="mb-3 line-clamp-3 flex-1 text-sm text-muted-foreground">
                  {recipe.description || '説明はありません。'}
                </p>
                {recipe.sourceUrl && (
                  <a
                    href={recipe.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="size-3" />
                    元のサイトを見る
                  </a>
                )}
                <div className="flex items-center gap-1.5 border-t border-border/40 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenEdit(recipe.id)
                    }}
                  >
                    <Pencil className="size-3" />
                    編集
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleShareFromCard(recipe.id)
                    }}
                  >
                    <Share2 className="size-3" />
                    共有
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* レシピ詳細ダイアログ */}
      <Dialog
        open={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open)
          if (!open) {
            setIsEditing(false)
            setShareUrl(null)
            setIsCopied(false)
          }
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl p-0">
          {isLoadingDetail ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedRecipe && isEditing ? (
            <div className="p-6">
              <DialogHeader className="mb-4 text-left">
                <DialogTitle>レシピを編集</DialogTitle>
                <DialogDescription>
                  レシピの内容を変更して保存できます。
                </DialogDescription>
              </DialogHeader>
              <RecipeForm
                mode="edit"
                unitNames={unitNames}
                initialData={{
                  title: selectedRecipe.title,
                  sourceUrl: selectedRecipe.sourceUrl ?? '',
                  description: selectedRecipe.description ?? '',
                  servings: selectedRecipe.servings?.toString() ?? '',
                  prepTime: selectedRecipe.prepTime?.toString() ?? '',
                  cookTime: selectedRecipe.cookTime?.toString() ?? '',
                  instructions: selectedRecipe.instructions ?? '',
                  memo: selectedRecipe.memo ?? '',
                  ingredients:
                    selectedRecipe.ingredients.length > 0
                      ? selectedRecipe.ingredients.map((ing) => ({
                          name: ing.name,
                          quantity: ing.quantity ?? '',
                          unit: ing.unit ?? '',
                        }))
                      : [{ name: '', quantity: '', unit: '' }],
                }}
                onSubmit={async (data) => {
                  try {
                    const result = await updateFn({
                      data: { ...data, recipeId: selectedRecipe.id },
                    })
                    if (result.success) {
                      toast.success('レシピを更新しました！')
                      setIsEditing(false)
                      // 更新後に詳細を再取得
                      const detail = await getDetailFn({
                        data: { recipeId: selectedRecipe.id },
                      })
                      setSelectedRecipe(detail as RecipeDetail)
                      navigate({ to: '/recipes' })
                    }
                  } catch (error) {
                    toast.error('レシピの更新に失敗しました。')
                    console.error(error)
                  }
                }}
                onCancel={() => setIsEditing(false)}
              />
            </div>
          ) : selectedRecipe ? (
            <>
              <ScrollArea className="max-h-[calc(85vh-3rem)]">
                <div className="flex flex-col gap-4 px-6 pb-6 pt-2">
                  <DialogHeader className="text-left">
                    <DialogTitle className="text-xl">
                      {selectedRecipe.title}
                    </DialogTitle>
                    {selectedRecipe.description && (
                      <DialogDescription>
                        {selectedRecipe.description}
                      </DialogDescription>
                    )}
                  </DialogHeader>

                  {/* メタ情報バッジ */}
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedRecipe.prepTime != null && (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="size-3" />
                        準備{selectedRecipe.prepTime}分
                      </Badge>
                    )}
                    {selectedRecipe.cookTime != null && (
                      <Badge variant="secondary" className="gap-1">
                        <ChefHat className="size-3" />
                        調理{selectedRecipe.cookTime}分
                      </Badge>
                    )}
                    {selectedRecipe.servings != null && (
                      <Badge variant="secondary" className="gap-1">
                        <Users className="size-3" />
                        {selectedRecipe.servings}人分
                      </Badge>
                    )}
                  </div>

                  {/* 材料セクション */}
                  {selectedRecipe.ingredients.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="mb-3 flex items-center gap-2 font-semibold text-base">
                          <List className="size-4" />
                          材料
                        </h3>
                        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                          {selectedRecipe.ingredients.map((ing) => (
                            <li
                              key={ing.id}
                              className="group flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-sm"
                            >
                              <span className="min-w-0 truncate">
                                {ing.name}
                              </span>
                              <span className="ml-2 flex shrink-0 items-center gap-1.5">
                                {(ing.quantity || ing.unit) && (
                                  <span className="text-muted-foreground">
                                    {[ing.quantity, ing.unit]
                                      .filter(Boolean)
                                      .join(' ')}
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="size-6 data-[loading=true]:opacity-100"
                                  data-loading={addingIngredientId === ing.id}
                                  disabled={addingIngredientId === ing.id}
                                  onClick={() => handleAddSingleIngredient(ing)}
                                >
                                  {addingIngredientId === ing.id ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <Plus className="size-3.5" />
                                  )}
                                </Button>
                              </span>
                            </li>
                          ))}
                        </ul>
                        <Button
                          variant="outline"
                          className="mt-3 w-full"
                          disabled={isAddingToShopping}
                          onClick={() => handleAddToShopping(selectedRecipe.id)}
                        >
                          {isAddingToShopping ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <ShoppingCart className="size-4" />
                          )}
                          買い物リストに追加
                        </Button>
                      </div>
                    </>
                  )}

                  {/* 調理手順セクション */}
                  {selectedRecipe.instructions && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="mb-3 flex items-center gap-2 font-semibold text-base">
                          <UtensilsCrossed className="size-4" />
                          作り方
                        </h3>
                        <div className="flex flex-col gap-3">
                          {selectedRecipe.instructions
                            .split('\n')
                            .filter((line) => line.trim())
                            .map((step, idx) => (
                              <div key={idx} className="flex gap-3 text-sm">
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                                  {idx + 1}
                                </span>
                                <p className="pt-0.5 leading-relaxed">
                                  {/* 先頭の番号や記号を除去して表示 */}
                                  {step.replace(/^\d+[.)]\s*/, '')}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* 元のサイトリンク */}
                  {selectedRecipe.sourceUrl && (
                    <>
                      <Separator />
                      <a
                        href={selectedRecipe.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="size-4" />
                        元のサイトを見る
                      </a>
                    </>
                  )}

                  {/* メモ */}
                  {selectedRecipe.memo && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="mb-2 flex items-center gap-2 font-semibold text-base">
                          <StickyNote className="size-4" />
                          メモ
                        </h3>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                          {selectedRecipe.memo}
                        </p>
                      </div>
                    </>
                  )}

                  {/* 共有 */}
                  <Separator />
                  {shareUrl ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-muted-foreground text-sm">
                        共有リンク
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={shareUrl}
                          className="text-sm"
                          onClick={(e) => e.currentTarget.select()}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={async () => {
                            await navigator.clipboard.writeText(shareUrl)
                            setIsCopied(true)
                            toast.success('リンクをコピーしました')
                            setTimeout(() => setIsCopied(false), 2000)
                          }}
                        >
                          {isCopied ? (
                            <Check className="size-4" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={isSharing}
                      onClick={async () => {
                        setIsSharing(true)
                        try {
                          const result = await shareFn({
                            data: { recipeId: selectedRecipe.id },
                          })
                          const url = `${window.location.origin}/share/${result.shareToken}`
                          setShareUrl(url)
                          await navigator.clipboard.writeText(url)
                          setIsCopied(true)
                          toast.success('共有リンクをコピーしました')
                          setTimeout(() => setIsCopied(false), 2000)
                        } catch (error) {
                          toast.error('共有リンクの作成に失敗しました。')
                          console.error(error)
                        } finally {
                          setIsSharing(false)
                        }
                      }}
                    >
                      {isSharing ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Share2 className="size-4" />
                      )}
                      共有リンクを作成
                    </Button>
                  )}

                  {/* 編集・削除 */}
                  <Separator />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsEditing(true)}
                    >
                      <Pencil className="size-4" />
                      編集
                    </Button>
                    <Button
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      disabled={isDeleting}
                      onClick={() => handleDeleteRecipe(selectedRecipe.id)}
                    >
                      {isDeleting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                      削除
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      {/* モバイル用FAB: レシピ追加ダイアログを開く */}
      <Button
        className="fixed right-4 bottom-20 z-40 size-14 rounded-full shadow-lg sm:hidden [&_svg]:size-6!"
        onClick={() => setIsDialogOpen(true)}
      >
        <Plus />
        <span className="sr-only">レシピを追加</span>
      </Button>
    </div>
  )
}

interface IngredientInput {
  name: string
  quantity: string
  unit: string
}

interface RecipeFormData {
  title: string
  sourceUrl?: string
  description?: string
  servings?: number
  prepTime?: number
  cookTime?: number
  instructions?: string
  memo?: string
  ingredients?: Array<{ name: string; quantity?: string; unit?: string }>
}

interface RecipeFormInitialData {
  title: string
  sourceUrl: string
  description: string
  servings: string
  prepTime: string
  cookTime: string
  instructions: string
  memo: string
  ingredients: IngredientInput[]
}

interface RecipeFormProps {
  mode: 'create' | 'edit'
  initialData?: RecipeFormInitialData
  onSubmit: (data: RecipeFormData) => Promise<void>
  onCancel?: () => void
  unitNames: string[]
}

function RecipeForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  unitNames,
}: RecipeFormProps) {
  const formId = useId()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [sourceUrl, setSourceUrl] = useState(initialData?.sourceUrl ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [servings, setServings] = useState(initialData?.servings ?? '')
  const [prepTime, setPrepTime] = useState(initialData?.prepTime ?? '')
  const [cookTime, setCookTime] = useState(initialData?.cookTime ?? '')
  const [instructions, setInstructions] = useState(
    initialData?.instructions ?? '',
  )
  const [memo, setMemo] = useState(initialData?.memo ?? '')
  const [ingredientInputs, setIngredientInputs] = useState<IngredientInput[]>(
    initialData?.ingredients ?? [{ name: '', quantity: '', unit: '' }],
  )

  const addIngredientRow = useCallback(() => {
    setIngredientInputs((prev) => [
      ...prev,
      { name: '', quantity: '', unit: '' },
    ])
  }, [])

  const removeIngredientRow = useCallback((index: number) => {
    setIngredientInputs((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateIngredient = useCallback(
    (index: number, field: keyof IngredientInput, value: string) => {
      setIngredientInputs((prev) =>
        prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)),
      )
    },
    [],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)
    try {
      // 空の材料行を除外
      const validIngredients = ingredientInputs
        .filter((ing) => ing.name.trim())
        .map((ing) => ({
          name: ing.name.trim(),
          quantity: ing.quantity.trim() || undefined,
          unit: ing.unit.trim() || undefined,
        }))

      await onSubmit({
        title: title.trim(),
        sourceUrl: sourceUrl.trim() || undefined,
        description: description.trim() || undefined,
        servings: servings ? Number.parseInt(servings, 10) : undefined,
        prepTime: prepTime ? Number.parseInt(prepTime, 10) : undefined,
        cookTime: cookTime ? Number.parseInt(cookTime, 10) : undefined,
        instructions: instructions.trim() || undefined,
        memo: memo.trim() || undefined,
        ingredients: validIngredients.length > 0 ? validIngredients : undefined,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isEdit = mode === 'edit'
  const submitLabel = isEdit ? '保存' : 'レシピを追加'
  const submittingLabel = isEdit ? '保存中...' : '追加中...'

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-0 overflow-hidden"
    >
      <ScrollArea className="max-h-[55vh] overflow-y-auto">
        <div className="flex flex-col gap-4 px-1 pb-2">
          {/* タイトル(必須) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${formId}-title`} className="text-sm font-medium">
              レシピ名<span className="text-destructive">*</span>
            </label>
            <Input
              id={`${formId}-title`}
              placeholder="例: 肉じゃが"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* 参照URL */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${formId}-sourceUrl`}
              className="text-sm font-medium"
            >
              参照URL
            </label>
            <Input
              id={`${formId}-sourceUrl`}
              type="url"
              placeholder="https://example.com/recipe/..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* 説明 */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${formId}-description`}
              className="text-sm font-medium"
            >
              説明
            </label>
            <Textarea
              id={`${formId}-description`}
              placeholder="レシピの簡単な説明..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={2}
            />
          </div>

          {/* メタ情報 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`${formId}-servings`}
                className="text-xs font-medium"
              >
                人数
              </label>
              <Input
                id={`${formId}-servings`}
                type="number"
                min={1}
                placeholder="4"
                value={servings}
                onChange={(e) => setServings(toHalfWidth(e.target.value))}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${formId}-prep`} className="text-xs font-medium">
                準備(分)
              </label>
              <Input
                id={`${formId}-prep`}
                type="number"
                min={0}
                placeholder="10"
                value={prepTime}
                onChange={(e) => setPrepTime(toHalfWidth(e.target.value))}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${formId}-cook`} className="text-xs font-medium">
                調理(分)
              </label>
              <Input
                id={`${formId}-cook`}
                type="number"
                min={0}
                placeholder="30"
                value={cookTime}
                onChange={(e) => setCookTime(toHalfWidth(e.target.value))}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* 材料リスト */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">材料</span>
            <div className="flex flex-col gap-2">
              {ingredientInputs.map((ing, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <Input
                      placeholder="材料名"
                      value={ing.name}
                      onChange={(e) =>
                        updateIngredient(idx, 'name', e.target.value)
                      }
                      disabled={isSubmitting}
                      className="min-w-0 flex-1"
                    />
                    <Input
                      placeholder="量"
                      value={ing.quantity}
                      onChange={(e) =>
                        updateIngredient(
                          idx,
                          'quantity',
                          toHalfWidth(e.target.value),
                        )
                      }
                      disabled={isSubmitting}
                      className="w-16 shrink-0"
                    />
                    <Input
                      placeholder="単位"
                      value={ing.unit}
                      onChange={(e) =>
                        updateIngredient(idx, 'unit', e.target.value)
                      }
                      disabled={isSubmitting}
                      className="w-18 shrink-0"
                    />
                    {ingredientInputs.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-8 shrink-0"
                        onClick={() => removeIngredientRow(idx)}
                        disabled={isSubmitting}
                      >
                        <Minus className="size-4" />
                      </Button>
                    )}
                  </div>
                  {/* 単位の候補チップ */}
                  <div className="flex flex-wrap gap-1 pl-0.5">
                    {unitNames.map((unitName) => (
                      <button
                        key={unitName}
                        type="button"
                        disabled={isSubmitting}
                        className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                          ing.unit === unitName
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-muted/50 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                        }`}
                        onClick={() => {
                          // 同じ単位をタップしたらクリア
                          updateIngredient(
                            idx,
                            'unit',
                            ing.unit === unitName ? '' : unitName,
                          )
                        }}
                      >
                        {unitName}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addIngredientRow}
              disabled={isSubmitting}
            >
              <Plus className="size-4" />
              材料を追加
            </Button>
          </div>

          {/* 作り方 */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${formId}-instructions`}
              className="text-sm font-medium"
            >
              作り方
            </label>
            <Textarea
              id={`${formId}-instructions`}
              placeholder={'1. 野菜を切る\n2. 鍋で煮込む\n3. 味付けをする'}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={isSubmitting}
              rows={6}
            />
          </div>

          {/* メモ */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${formId}-memo`} className="text-sm font-medium">
              メモ
            </label>
            <Textarea
              id={`${formId}-memo`}
              placeholder="コツや気付いたことなど自由にメモ..."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>
        </div>
      </ScrollArea>

      {/* 送信ボタンはスクロール領域の外に固定 */}
      <div className="flex gap-2 border-t px-1 pt-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className="flex-1"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isEdit ? (
            <Pencil className="size-4" />
          ) : (
            <Plus className="size-4" />
          )}
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  )
}
