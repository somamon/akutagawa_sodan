import Anthropic from '@anthropic-ai/sdk'
import { AKUTAGAWA_SYSTEM_PROMPT } from '../utils/akutagawaPersona'
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
    throw createError({ statusCode: 400, statusMessage: '相談内容が空です' })
  }
  if (query.length > 2000) {
    throw createError({ statusCode: 400, statusMessage: '相談は2000字以内で頼む' })
  }

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
      const stream = anthropic.beta.messages.stream({
        model: 'claude-opus-5',
        max_tokens: 4096,
        // 安全分類器による拒否時に自動で別モデルへフォールバックする
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
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

      await push({ type: 'done', id })
    } catch (error) {
      console.error('[ask] 回答生成に失敗:', error)
      await push({ type: 'error', message: '回答の生成に失敗した。時を置いて、また訪ねてくれたまえ。' })
    } finally {
      await eventStream.close()
    }
  })()

  return eventStream.send()
})
