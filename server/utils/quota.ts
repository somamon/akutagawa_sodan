import { randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'
import { useSupabase } from './supabase'
import type { VerifiedPurchase } from './purchase'

/**
 * 1日あたりの相談回数。Web版・アプリ版のどちらにも掛ける。
 * AI生成は1回ごとに実費がかかるため、購入後も「無制限」にはせず上限を上げる形にしている。
 * 実際の数値は runtimeConfig（NUXT_WEB_DAILY_LIMIT / NUXT_FREE_DAILY_LIMIT / NUXT_PRO_DAILY_LIMIT）で調整できる。
 */
export interface QuotaStatus {
  /** 買い切りを購入済みか */
  isPro: boolean
  /** 今日の上限 */
  limit: number
  /** 無料枠の上限（購入を勧める文言に使う） */
  freeLimit: number
  /** 購入後の上限（同上） */
  proLimit: number
  /** 今日すでに使った回数 */
  used: number
  /** 残り回数 */
  remaining: number
  /** 次に枠が戻る時刻（日本時間の翌0時）のISO文字列 */
  resetAt: string
}

/** 回数を数える単位。アプリは端末ごと、Webはブラウザごとに数える */
export type AskSubject = { kind: 'app' | 'web'; id: string }

/** 想定はUUID。長すぎる値や記号で app_usage を荒らされないよう形を絞る */
const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/

const VISITOR_COOKIE = 'akutagawa_visitor'

/** アプリが送ってくる端末ID。ヘッダになければ null（＝Web版からのアクセス） */
export function getDeviceId(event: H3Event): string | null {
  const raw = getRequestHeader(event, 'x-device-id')?.trim()
  if (!raw) return null
  return ID_PATTERN.test(raw) ? raw : null
}

/**
 * Web版の相談者を識別するID。Cookieに無ければ発行して応答に載せる。
 * Cookieを消せば無料枠を取り直せてしまうので、これ単体は当てにせず
 * consumeAskQuota 内のIP単位の上限と併用して初めて意味を持つ。
 */
export function getWebVisitorId(event: H3Event): string {
  const existing = getCookie(event, VISITOR_COOKIE)?.trim()
  if (existing && ID_PATTERN.test(existing)) return existing

  const id = randomUUID()
  setCookie(event, VISITOR_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.dev,
    path: '/',
    maxAge: 400 * 24 * 60 * 60,
  })
  return id
}

/** この相談が誰の枠を消費するかを決める */
export function resolveAskSubject(event: H3Event): AskSubject {
  const deviceId = getDeviceId(event)
  return deviceId
    ? { kind: 'app', id: deviceId }
    : { kind: 'web', id: getWebVisitorId(event) }
}

/** app_usage.subject に入れるキー。'device:' はアプリ公開前からの既存行と揃えている */
function subjectKey(subject: AskSubject): string {
  return subject.kind === 'app' ? `device:${subject.id}` : `web:${subject.id}`
}

/** 日本時間の翌0時（＝枠が戻る時刻） */
function nextResetAt(): string {
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000
  const now = Date.now()
  const jstMidnight = Math.floor((now + JST_OFFSET_MS) / 86_400_000 + 1) * 86_400_000
  return new Date(jstMidnight - JST_OFFSET_MS).toISOString()
}

export function dailyLimitFor(subject: AskSubject, isPro: boolean): number {
  const config = useRuntimeConfig()
  // Web版には買い切りの導線がないので、常に無料枠として扱う
  if (subject.kind === 'web') return config.webDailyLimit
  return isPro ? config.proDailyLimit : config.freeDailyLimit
}

/** 買い切りの有無を引く。Web版には購入導線がないので問い合わせない */
async function resolveIsPro(subject: AskSubject): Promise<boolean> {
  return subject.kind === 'app' ? await isEntitled(subject.id) : false
}

/** 「無料は1日N回、購入すると1日M回」と案内するための値 */
function limitLabels(): { freeLimit: number; proLimit: number } {
  const config = useRuntimeConfig()
  return { freeLimit: config.freeDailyLimit, proLimit: config.proDailyLimit }
}

/** この端末が買い切りを購入済みかどうか */
export async function isEntitled(deviceId: string): Promise<boolean> {
  const supabase = useSupabase()
  const { data, error } = await supabase
    .from('app_entitlements')
    .select('transaction_id')
    .eq('device_id', deviceId)
    .limit(1)

  if (error) {
    console.error('[quota] 購入状態の取得に失敗:', error)
    // DBが読めないときに課金済みユーザーを締め出さないよう、無料枠として扱って先へ進める
    return false
  }
  return (data?.length ?? 0) > 0
}

/** 消費せずに今日の状況だけを見る */
export async function getQuotaStatus(subject: AskSubject): Promise<QuotaStatus> {
  const supabase = useSupabase()
  const isPro = await resolveIsPro(subject)
  const limit = dailyLimitFor(subject, isPro)

  const { data, error } = await supabase.rpc('peek_app_quota', { p_subject: subjectKey(subject) })
  if (error) console.error('[quota] 利用回数の取得に失敗:', error)

  const used = typeof data === 'number' ? data : 0
  return {
    isPro,
    limit,
    ...limitLabels(),
    used,
    remaining: Math.max(limit - used, 0),
    resetAt: nextResetAt(),
  }
}

interface ConsumeResult {
  allowed: boolean
  used: number
  limit: number
}

/** 1回分の枠をアトミックに消費する。上限に達していれば allowed:false */
async function consume(subject: string, limit: number): Promise<ConsumeResult> {
  const supabase = useSupabase()
  const { data, error } = await supabase.rpc('consume_app_quota', {
    p_subject: subject,
    p_limit: limit,
  })

  if (error) {
    console.error('[quota] 枠の消費に失敗:', error)
    // 数え損ねても相談自体は通す（課金済みユーザーを止めないことを優先する）
    return { allowed: true, used: 0, limit }
  }

  const row = Array.isArray(data) ? data[0] : data
  return {
    allowed: Boolean(row?.allowed),
    used: Number(row?.used ?? 0),
    limit: Number(row?.quota_limit ?? limit),
  }
}

/**
 * 相談1回分を確保する。上限に達していれば 402 を投げる。
 * 端末ID・Cookieはどちらもクライアント側で作り直せる値なので、それだけでは
 * 無料枠を取り直されてしまう。その乱用を鈍らせるため、IP単位の日次上限も併せて見る。
 */
export async function consumeAskQuota(event: H3Event, subject: AskSubject): Promise<QuotaStatus> {
  const config = useRuntimeConfig()
  const isPro = await resolveIsPro(subject)
  const limit = dailyLimitFor(subject, isPro)

  const result = await consume(subjectKey(subject), limit)
  if (!result.allowed) {
    // 買い切りを勧められるのは、購入導線のあるアプリ版の無料ユーザーだけ
    const canUpsell = subject.kind === 'app' && !isPro
    throw createError({
      statusCode: 402,
      statusMessage: 'Payment Required',
      message: canUpsell
        ? `今日の相談はここまでだ（1日${limit}回）。もっと話したいなら、書斎の鍵を求めるがいい。`
        : `今日の相談はここまでだ（1日${limit}回）。日を改めて訪ねてくれたまえ。`,
      data: { reason: canUpsell ? 'free_limit' : 'daily_limit', isPro, limit, used: result.used },
    })
  }

  const ip = getRequestIP(event, { xForwardedFor: true })
  if (ip) {
    const perIp = await consume(`ip:${ip}`, config.ipDailyLimit)
    if (!perIp.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too Many Requests',
        message: '同じ回線からの相談が多すぎる。日を改めてくれたまえ。',
      })
    }
  }

  return {
    isPro,
    limit: result.limit,
    ...limitLabels(),
    used: result.used,
    remaining: Math.max(result.limit - result.used, 0),
    resetAt: nextResetAt(),
  }
}

/**
 * 検証済みのレシートを端末に紐付ける。
 * 機種変更や再インストール後の「購入を復元」では同じレシートが別の端末IDで届くため、
 * transaction_id を主キーにして device_id を貼り替える。
 */
/**
 * 消費した1回分を返す（生成に失敗したとき用）。
 * 返却自体に失敗しても相談の処理は続行させたいので、例外は投げずログに留める。
 */
export async function refundAskQuota(subject: AskSubject): Promise<void> {
  try {
    const supabase = useSupabase()
    const { error } = await supabase.rpc('refund_app_quota', { p_subject: subjectKey(subject) })
    if (error) console.error('[quota] 返却に失敗:', error)
  } catch (e) {
    console.error('[quota] 返却時に例外:', e)
  }
}

export async function grantEntitlement(deviceId: string, purchase: VerifiedPurchase) {
  const supabase = useSupabase()
  const { error } = await supabase.from('app_entitlements').upsert(
    {
      transaction_id: purchase.transactionId,
      device_id: deviceId,
      platform: purchase.platform,
      product_id: purchase.productId,
      original_transaction_id: purchase.originalTransactionId,
      purchased_at: purchase.purchasedAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'transaction_id' },
  )

  if (error) {
    console.error('[quota] 購入の保存に失敗:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: '購入の記録に失敗した。時を置いて、もう一度「購入を復元」を試してくれたまえ。',
    })
  }
}
