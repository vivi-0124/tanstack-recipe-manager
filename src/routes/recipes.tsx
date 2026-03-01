import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { BookOpen, ExternalLink, Plus, RefreshCcw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { importRecipe } from '../actions/recipes'
import { getMyRecipes } from '../actions/recipes_get'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { Input } from '../components/ui/input'

export const Route = createFileRoute('/recipes')({
  component: RecipesPage,
  loader: async () => {
    // Fetch recipes on load
    const recipes = await getMyRecipes()
    return { recipes }
  },
})

function RecipesPage() {
  const { recipes } = Route.useLoaderData()
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  const importFn = useServerFn(importRecipe)

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return

    setIsImporting(true)
    try {
      const result = await importFn({ data: { url } })
      if (result.success) {
        toast.success('レシピをインポートしました！')
        setUrl('')
        // Refresh the page to show new recipe
        navigate({ to: '/recipes' })
      }
    } catch (error) {
      toast.error('インポートに失敗しました。')
      console.error(error)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          マイレシピ
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          お気に入りのレシピを管理し、新しいレシピをインポートしましょう。
        </p>
      </div>

      <Card className="mt-4 border-border/60 bg-muted/30 sm:mt-6">
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-base">新しいレシピをインポート</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            レシピサイトのURLを入力して、材料と手順を自動で取得します。
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
          <form
            onSubmit={handleImport}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <Input
              type="url"
              placeholder="https://example.com/recipe/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={isImporting}
              className="flex-1"
            />
            <Button type="submit" disabled={isImporting} className="shrink-0">
              {isImporting ? (
                <RefreshCcw className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              インポート
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {recipes.length === 0 ? (
          <div className="col-span-full flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 py-12 sm:py-16">
            <BookOpen className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              レシピがまだありません。上のフォームからインポートしましょう!
            </p>
          </div>
        ) : (
          recipes.map((recipe) => (
            <Card key={recipe.id} className="flex flex-col border-border/60">
              <CardHeader>
                <CardTitle className="line-clamp-1 text-base">
                  {recipe.title}
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                  {recipe.sourceUrl && (
                    <a
                      href={recipe.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      元のサイトを見る
                    </a>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">
                  {recipe.description || '説明はありません。'}
                </p>
                <div className="flex gap-3 text-xs font-medium text-muted-foreground">
                  {recipe.prepTime && (
                    <span className="rounded-full bg-muted px-2 py-0.5">
                      計{recipe.prepTime + (recipe.cookTime || 0)}分
                    </span>
                  )}
                  {recipe.servings && (
                    <span className="rounded-full bg-muted px-2 py-0.5">
                      {recipe.servings}人分
                    </span>
                  )}
                </div>
              </CardContent>
              <div className="mt-auto border-t p-4">
                <Button variant="outline" className="w-full" disabled>
                  詳細を見る (準備中)
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
