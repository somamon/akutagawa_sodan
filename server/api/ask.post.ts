import Anthropic from '@anthropic-ai/sdk'
import { AKUTAGAWA_SYSTEM_PROMPT } from '../utils/akutagawaPersona'
import { checkRateLimit } from '../utils/rateLimit'
import { consumeAskQuota, resolveAskSubject } from '../utils/quota'
import { useSupabase } from '../utils/supabase'
import type { AskStreamMessage } from '~/types/consultation'

interface AskBody {
  nickname: string
  query: string
  isPublic: boolean
}

/**
 * POST /api/ask
 * 相談を受け取り、AI芥川の回答を SSE でストリーミングする。
 * ストリーム完了後に Supabase へ保存し、`done` イベントで投稿IDを返す。
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<AskBody>(event)

  const nickname = (body?.nickname ?? '').trim().slice(0, 30) || '名無しの相談者'
  const query = (body?.query ?? '').trim()
  const isPublic = body?.isPublic !== false

  if (!query) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: '相談内容が空です' })
  }
  if (query.length > 2000) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: '相談は2000字以内で頼む' })
  }

  // AI生成はコストが高いため厳しめに制限（1 IPあたり10分に5回）
  checkRateLimit(event, {
    name: 'ask',
    limit: 5,
    windowMs: 10 * 60 * 1000,
    message: '相談が続きすぎている。茶でも飲んで、しばし待ちたまえ。',
  })

  // Web版・アプリ版のどちらも1回分の枠を確保してから生成に進む
  // （上限に達していれば 402）。アプリは端末ID、WebはCookieで数える。
  const quota = await consumeAskQuota(event, resolveAskSubject(event))

  const config = useRuntimeConfig()
  if (!config.anthropicApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'NUXT_ANTHROPIC_API_KEY が設定されていません' })
  }

  const anthropic = new Anthropic({ apiKey: config.anthropicApiKey })
  const eventStream = createEventStream(event)

  const push = (msg: AskStreamMessage) => eventStream.push(JSON.stringify(msg))

  // レスポンスは即座に返し、生成・保存は裏で進める
  ;(async () => {
    try {
      // 無料枠は Sonnet 5、買い切りユーザーだけ Opus 5。
      // 人格・文体・字数は同じシステムプロンプトで揃えているので、差は回答の深さに出る。
      const isPro = quota.isPro
      const stream = anthropic.beta.messages.stream({
        model: isPro ? 'claude-opus-5' : 'claude-sonnet-5',
        max_tokens: 4096,
        // 安全分類器に拒否されたとき別モデルへ退避する。退避先を持つのは Opus 5 だけで
        // （claude-sonnet-5 の allowed_fallback_models は空）、Sonnet 5 の拒否は
        // 下の stop_reason === 'refusal' で受け止める。
        ...(isPro
          ? {
              betas: ['server-side-fallback-2026-07-01' as const],
              fallbacks: 'default' as const,
            }
          : {}),
        system: AKUTAGAWA_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `ペンネーム「${nickname}」より相談です。\n\n${query}`,
          },
        ],
      })

      let answer = ''
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          answer += chunk.delta.text
          await push({ type: 'delta', text: chunk.delta.text })
        }
      }

      const finalMessage = await stream.finalMessage()
      if (finalMessage.stop_reason === 'refusal') {
        const apology = '……その相談には、僕は答えを持ち合わせていない。別の悩みを聞かせてくれたまえ。'
        answer = apology
        await push({ type: 'delta', text: apology })
      }

      // 個別ページ・シェアURLを成立させるため非公開でも保存し、
      // タイムラインへの表示のみ is_public で制御する
      let id: string | null = null
      try {
        const supabase = useSupabase()
        const { data, error } = await supabase
          .from('consultations')
          .insert({ nickname, query, answer, is_public: isPublic })
          .select('id')
          .single()
        if (error) {
          console.error('[ask] Supabase への保存に失敗:', error)
        } else {
          id = data.id
        }
      } catch (dbError) {
        console.error('[ask] Supabase クライアント初期化に失敗:', dbError)
      }

      await push({
        type: 'done',
        id,
        quota: { isPro: quota.isPro, limit: quota.limit, remaining: quota.remaining },
      })
    } catch (error) {
      console.error('[ask] 回答生成に失敗:', error)
      await push({ type: 'error', message: '回答の生成に失敗した。時を置いて、また訪ねてくれたまえ。' })
    } finally {
      await eventStream.close()
    }
  })()

  return eventStream.send()
})
