import type { H3Event } from 'h3'

/**
 * IPベースの簡易レート制限（スライディングウィンドウ・インメモリ）。
 * 単一プロセス前提。サーバーレスやマルチインスタンス構成に移行する場合は
 * Redis等の共有ストアに置き換えること。
 */
const buckets = new Map<string, number[]>()
const MAX_TRACKED_KEYS = 10_000

export function checkRateLimit(
  event: H3Event,
  options: { name: string; limit: number; windowMs: number; message: string },
) {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const key = `${options.name}:${ip}`
  const now = Date.now()

  // メモリの無限成長を防ぐ：肥大化したら期限切れキーを掃除する
  if (buckets.size > MAX_TRACKED_KEYS) {
    for (const [k, timestamps] of buckets) {
      if (timestamps.every((t) => now - t >= options.windowMs)) buckets.delete(k)
    }
  }

  const recent = (buckets.get(key) ?? []).filter((t) => now - t < options.windowMs)
  if (recent.length >= options.limit) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: options.message,
    })
  }

  recent.push(now)
  buckets.set(key, recent)
}
