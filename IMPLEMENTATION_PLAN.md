# IMPLEMENTATION_PLAN - Recipe Manager

このドキュメントは、要件定義に基づく Recipe Manager の実装手順をまとめたロードマップです。

## 1. 開発環境のセットアップ
実装を開始する前に、必要なパッケージの導入と外部サービスとの連携準備を行います。

- **パッケージのインストール**
  - `pnpm add better-auth inngest @mendable/firecrawl-js lucide-react`
  - `pnpm add -D drizzle-kit@latest @types/better-sqlite3`
- **環境変数の設定 (`.env`)**
  - `BETTER_AUTH_SECRET`: Better Auth 用のランダムな文字列
  - `FIRECRAWL_API_KEY`: Firecrawl の API キー
  - `DATABASE_URL`: SQLite/LibSQL の接続パス
- **ディレクトリ構造の作成**
  - `src/lib/auth/`: 認証関連
  - `src/lib/inngest/`: バックグラウンドジョブ関連
  - `src/routes/api/`: API エンドポイント

## 2. データベーススキーマの構築 (`src/db/schemas/schema.ts`)
Drizzle ORM を使用して、認証およびアプリケーション固有のテーブルを定義します。

- **Auth 関連 (Better Auth 標準)**
  - `user`, `session`, `account`, `verification`
- **アプリケーション固有**
  - `recipes`: レシピ本体（`id`, `userId`, `title`, `sourceUrl`, `instructions`, `imageUrl` など）
  - `ingredients`: 食材在庫管理（`id`, `userId`, `name`, `quantity`, `unit`, `expiryDate` など）
  - `shopping_lists`: 買い物リスト（`id`, `userId`, `recipeId`, `name`, `isPurchased` など）
  - `recipe_tags`: カテゴリ管理用
- **反映**
  - `pnpm drizzle-kit push` で DB に反映

## 3. 認証基盤の統合 (Better Auth)
TanStack Start と Better Auth を連携させます。

- **サーバー設定 (`src/lib/auth.ts`)**
  - `betterAuth` インスタンスの作成と Drizzle アダプターの設定
- **クライアント設定 (`src/lib/auth-client.ts`)**
  - フロントエンド用 Auth クライアントの作成
- **API 通路 (`src/routes/api/auth/$.ts`)**
  - 全ての認証リクエストを Better Auth ハンドラーへ転送

## 4. バックグラウンドジョブ (Inngest & Firecrawl)
URL からのレシピ抽出を非同期で実行する仕組みを作ります。

- **Inngest クライアント (`src/lib/inngest/client.ts`)**
  - Client の初期化
- **インポート関数 (`src/lib/inngest/functions.ts`)**
  - Firecrawl を使用してウェブサイトをスクレイピング
  - 取得データをパースし、`recipes` テーブルへ保存
- **API エンドポイント (`src/routes/api/inngest.ts`)**
  - Inngest サーバーからのトリガー受信用

## 5. UI とルーティングの実装
TanStack Router を使用した画面遷移と、shadcn/ui によるレスポンシブ UI を構築します。

- **ナビゲーション (`src/routes/__root.tsx`)**
  - サイドバーとモバイル用メニューの設置
- **主要画面**
  - `index.tsx`: ダッシュボード（在庫アラート表示）
  - `recipes/index.tsx`: レシピ一覧・インポート UI
  - `inventory/index.tsx`: 食材管理（期限管理）
  - `shopping-list/index.tsx`: 買い物リスト（チェックリスト）

## 6. 実装上の注意点
- **Server Actions**: `createServerFn` を活用し、フロントエンドから安全に DB 操作を行う。
- **バリデーション**: `zod` を使用して、ユーザー入力と API レスポンスを厳密に検証する。
- **モバイル対応**: `use-mobile` フック等を使用し、PC・スマホ両方で快適な操作性を確保する。
