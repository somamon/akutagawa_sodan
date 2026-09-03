import { TwitterApi } from 'twitter-api-v2'
import { REPORT_HIDE_THRESHOLD } from './moderation'
import { useSupabase } from './supabase'

/**
 * 公開中の相談から1件選んで X に投稿する。
 * バズは必ず終わるので、その後も細く露出を続けるための仕組み。
 *
 * 投稿済みの目印は consultations.posted_at に残し、同じ相談を二度出さない。
 * 認証情報が未設定なら、何もせず理由を返す（本番以外で誤爆させないため）。
 */

/** Xの文字数計算。日本語などは2、ASCIIは1として数え、URLは一律23 */
const MAX_WEIGHT = 280
const URL_WEIGHT = 23

function weigh(text: string): number {
  let w = 0
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    // 半角英数記号は1、それ以外（日本語など）は2
    w += code <= 0x10ff || (code >= 0x2000 && code <= 0x200d) ? 1 : 2
  }
  return w
}

/** 指定の重み以内に収まるよう末尾を削る */
function trimToWeight(text: string, maxWeight: number): string {
  if (weigh(text) <= maxWeight) return text
  let out = ''
  for (const ch of text) {
    if (weigh(out + ch) > maxWeight - 2) break
    out += ch
  }
  return `${out}…`
}

export interface DailyPostResult {
  posted: boolean
  reason?: string
  id?: string
  text?: string
}

/** 投稿文を組み立てる（URLの分を確保したうえで相談と回答を詰める） */
export function composePost(params: {
  nickname: string
  query: string
  answer: string
  url: string
}): string {
  const budget = MAX_WEIGHT - URL_WEIGHT - 6 // 改行の分を少し見ておく
  const queryPart = trimToWeight(params.query.replace(/\s+/g, ' ').trim(), 80)
  const answerBudget = budget - weigh(queryPart) - weigh(`「」\n\n\n\n`)
  const answerPart = trimToWeight(params.answer.replace(/\s+/g, ' ').trim(), answerBudget)

  return `「${queryPart}」\n\n${answerPart}\n\n${params.url}`
}

export async function postDailyConsultation(): Promise<DailyPostResult> {
  const config = useRuntimeConfig()
  const { xApiKey, xApiSecret, xAccessToken, xAccessSecret } = config

  if (!xApiKey || !xApiSecret || !xAccessToken || !xAccessSecret) {
    return { posted: false, reason: 'Xの認証情報が未設定のため送信しません' }
  }

  const supabase = useSupabase()

  // 反響のあったものから順に出す。同数なら新しいもの。
  const { data, error } = await supabase
    .from('consultations')
    .select('id, nickname, query, answer')
    .eq('is_public', true)
    .is('posted_at', null)
    .lt('reports', REPORT_HIDE_THRESHOLD)
    .order('likes', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[xPost] 投稿候補の取得に失敗:', error)
    return { posted: false, reason: '投稿候補の取得に失敗しました' }
  }
  if (!data) {
    return { posted: false, reason: '未投稿の公開相談がありません' }
  }

  const text = composePost({
    nickname: data.nickname,
    query: data.query,
    answer: data.answer,
    url: `${config.public.siteUrl}/result/${data.id}`,
  })

  const client = new TwitterApi({
    appKey: xApiKey,
    appSecret: xApiSecret,
    accessToken: xAccessToken,
    accessSecret: xAccessSecret,
  })

  await client.v2.tweet(text)

  // 投稿できた分だけ印を付ける。ここが失敗しても投稿は済んでいるので、
  // 二重投稿を防ぐためエラーは握らずログに残す。
  const { error: markError } = await supabase
    .from('consultations')
    .update({ posted_at: new Date().toISOString() })
    .eq('id', data.id)
  if (markError) console.error('[xPost] posted_at の更新に失敗:', markError)

  return { posted: true, id: data.id, text }
}
