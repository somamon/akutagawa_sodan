import { checkRateLimit } from '../../../utils/rateLimit'
import { useSupabase } from '../../../utils/supabase'

/**
 * POST /api/consultations/:id/like
 * いいねを1つ加算し、加算後の件数を返す。
 * 「1人1回」の建前はクライアントの localStorage、
 * 連打・スクリプトによる水増しはIPレート制限で抑止する。
 */
export default defineEventHandler(async (event): Promise<{ likes: number }> => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'IDが指定されていません' })
  }

  checkRateLimit(event, {
    name: 'like',
    limit: 10,
    windowMs: 60 * 1000,
    message: '共感の押しすぎだ。少し落ち着きたまえ。',
  })

  const supabase = useSupabase()
  const { data, error } = await supabase.rpc('increment_likes', { consultation_id: id })

  if (error) {
    console.error('[like] 加算に失敗:', error)
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error', message: 'いいねに失敗しました' })
  }

  return { likes: data as number }
})
