import { YoutubeTranscript } from 'youtube-transcript'

const YOUTUBE_URL_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
]

/**
 * Check if the given URL is a YouTube URL.
 */
export const isYouTubeUrl = (url: string): boolean => {
  return YOUTUBE_URL_PATTERNS.some((pattern) => pattern.test(url))
}

/**
 * Extract video ID from a YouTube URL.
 * Supports standard watch URLs, short URLs (youtu.be), shorts, and embed URLs.
 */
export const extractVideoId = (url: string): string | null => {
  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = url.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
  }
  return null
}

interface YouTubeVideoInfo {
  transcript: string | null
  description: string | null
  title: string | null
}

/**
 * Fetch transcript and metadata from a YouTube video.
 * Attempts to get Japanese transcript first, then falls back to any available language.
 */
export const fetchYouTubeVideoInfo = async (
  url: string,
): Promise<YouTubeVideoInfo> => {
  const videoId = extractVideoId(url)
  if (!videoId) {
    throw new Error('Invalid YouTube URL')
  }

  let transcript: string | null = null
  let description: string | null = null
  let title: string | null = null

  // 字幕の取得を試みる（日本語 → 英語 → 言語指定なし）
  const langPriority = ['ja', 'en', undefined]
  for (const lang of langPriority) {
    try {
      const segments = await YoutubeTranscript.fetchTranscript(
        videoId,
        lang ? { lang } : undefined,
      )
      transcript = segments.map((s) => s.text).join(' ')
      break
    } catch {
      // 指定言語の字幕がない場合、次の言語を試す
    }
  }

  // oEmbedエンドポイントからタイトルを取得
  try {
    const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    const res = await fetch(oEmbedUrl)
    if (res.ok) {
      const data = (await res.json()) as { title?: string }
      title = data.title ?? null
    }
  } catch {
    // oEmbedの取得に失敗しても続行
  }

  // YouTube Data APIがあれば説明欄を取得（APIキーがある場合のみ）
  const ytApiKey = process.env.YOUTUBE_DATA_API_KEY
  if (ytApiKey) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${ytApiKey}`
      const res = await fetch(apiUrl)
      if (res.ok) {
        const data = (await res.json()) as {
          items?: Array<{ snippet?: { description?: string; title?: string } }>
        }
        const snippet = data.items?.[0]?.snippet
        if (snippet) {
          description = snippet.description ?? null
          // oEmbedでタイトルが取れなかった場合のフォールバック
          if (!title) {
            title = snippet.title ?? null
          }
        }
      }
    } catch {
      // Data APIの取得に失敗しても続行
    }
  }

  if (!transcript && !description) {
    throw new Error(
      'Could not retrieve transcript or description from the YouTube video. The video may not have captions available.',
    )
  }

  return { transcript, description, title }
}
