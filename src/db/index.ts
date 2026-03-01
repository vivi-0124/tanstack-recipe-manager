import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/libsql'

config({ path: ['.env.local', '.env'] })

// サーバーサイドでのみ実行されるため、環境変数が未定義の場合はエラーを投げる
const connectionUrl = process.env.TURSO_CONNECTION_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!connectionUrl) {
  throw new Error('TURSO_CONNECTION_URL is not defined')
}

export const db = drizzle({
  connection: {
    url: connectionUrl,
    authToken,
  },
})
