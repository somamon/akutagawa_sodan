import { useSupabase } from '../../../utils/supabase'

/**
 * POST /api/consultations/:id/like
 * いいねを1つ加算し、加算後の件数を返す。
 * （1人1回の制御はクライアント側の localStorage で行う）
 */
export default defineEventHandler(async (event): Promise<{ likes: number }> => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'IDが指定されていません' })
  }

  const supabase = useSupabase()
  const { data, error } = await supabase.rpc('increment_likes', { consultation_id: id })

  if (error) {
    console.error('[like] 加算に失敗:', error)
    throw createError({ statusCode: 500, statusMessage: 'いいねに失敗しました' })
  }

  return { likes: data as number }
})
