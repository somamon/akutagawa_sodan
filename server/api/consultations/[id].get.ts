import { useSupabase } from '../../utils/supabase'
import type { Consultation } from '~/types/consultation'

/**
 * GET /api/consultations/:id
 * 個別の相談を返す（結果ページ・シェアURL用）。
 * URLを知っている人は非公開の投稿も閲覧できる仕様。
 */
export default defineEventHandler(async (event): Promise<Consultation> => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'IDが指定されていません' })
  }

  const supabase = useSupabase()
  const { data, error } = await supabase
    .from('consultations')
    .select('id, nickname, query, answer, is_public, likes, created_at')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[consultations/:id] 取得に失敗:', error)
    throw createError({ statusCode: 500, statusMessage: '相談の取得に失敗しました' })
  }
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'その相談は見当たらない' })
  }

  return data as Consultation
})
