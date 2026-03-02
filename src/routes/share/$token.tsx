import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  BookmarkPlus,
  ChefHat,
  Clock,
  ExternalLink,
  List,
  Loader2,
  LogIn,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  getSharedRecipe,
  getSharePageSession,
  importSharedRecipe,
} from '../../actions/sharing'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'
import { Separator } from '../../components/ui/separator'

export const Route = createFileRoute('/share/$token')({
  component: SharedRecipePage,
  loader: async ({ params: { token } }) => {
    const [recipe, session] = await Promise.all([
      getSharedRecipe({ data: { token } }),
      getSharePageSession(),
    ])
    return { recipe, session, token }
  },
  errorComponent: SharedRecipeError,
})

function SharedRecipeError() {
  return (
    <div className="container mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>レシピが見つかりません</CardTitle>
          <CardDescription>
            このリンクは無効か、レシピが削除された可能性があります。
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}

function SharedRecipePage() {
  const { recipe, session, token } = Route.useLoaderData()
  const navigate = useNavigate()
  const [isImporting, setIsImporting] = useState(false)
  const importFn = useServerFn(importSharedRecipe)

  const handleImport = async () => {
    setIsImporting(true)
    try {
      const result = await importFn({ data: { token } })
      if (result.success) {
        toast.success('レシピを追加しました！')
        navigate({ to: '/recipes' })
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'レシピの追加に失敗しました。'
      // 自分のレシピの場合は専用メッセージ
      if (message.includes('Cannot import your own recipe')) {
        toast.error('自分のレシピは追加できません。')
      } else {
        toast.error('レシピの追加に失敗しました。')
      }
      console.error(error)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-xl">{recipe.title}</CardTitle>
          {recipe.description && (
            <CardDescription>{recipe.description}</CardDescription>
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* メタ情報バッジ */}
          <div className="flex flex-wrap items-center gap-2">
            {recipe.prepTime != null && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="size-3" />
                準備{recipe.prepTime}分
              </Badge>
            )}
            {recipe.cookTime != null && (
              <Badge variant="secondary" className="gap-1">
                <ChefHat className="size-3" />
                調理{recipe.cookTime}分
              </Badge>
            )}
            {recipe.servings != null && (
              <Badge variant="secondary" className="gap-1">
                <Users className="size-3" />
                {recipe.servings}人分
              </Badge>
            )}
          </div>

          {/* 材料セクション */}
          {recipe.ingredients.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-base">
                  <List className="size-4" />
                  材料
                </h3>
                <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {recipe.ingredients.map((ing) => (
                    <li
                      key={ing.id}
                      className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-sm"
                    >
                      <span className="min-w-0 truncate">{ing.name}</span>
                      {(ing.quantity || ing.unit) && (
                        <span className="ml-2 shrink-0 text-muted-foreground">
                          {[ing.quantity, ing.unit].filter(Boolean).join(' ')}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* 調理手順セクション */}
          {recipe.instructions && (
            <>
              <Separator />
              <div>
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-base">
                  <UtensilsCrossed className="size-4" />
                  作り方
                </h3>
                <div className="flex flex-col gap-3">
                  {recipe.instructions
                    .split('\n')
                    .filter((line) => line.trim())
                    .map((step, idx) => {
                      const stepKey = `step-${step.slice(0, 20)}-${idx}`
                      return (
                        <div key={stepKey} className="flex gap-3 text-sm">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                            {idx + 1}
                          </span>
                          <p className="pt-0.5 leading-relaxed">
                            {step.replace(/^\d+[.)]\s*/, '')}
                          </p>
                        </div>
                      )
                    })}
                </div>
              </div>
            </>
          )}

          {/* 元のサイトリンク */}
          {recipe.sourceUrl && (
            <>
              <Separator />
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="size-4" />
                元のサイトを見る
              </a>
            </>
          )}

          {/* インポートボタン */}
          <Separator />
          {session.isAuthenticated ? (
            <Button
              className="w-full"
              size="lg"
              disabled={isImporting}
              onClick={handleImport}
            >
              {isImporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <BookmarkPlus className="size-4" />
              )}
              自分のレシピに追加
            </Button>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-4">
              <p className="text-center text-muted-foreground text-sm">
                レシピを追加するにはログインが必要です
              </p>
              <Button asChild variant="outline">
                <a href="/">
                  <LogIn className="size-4" />
                  ログインする
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
