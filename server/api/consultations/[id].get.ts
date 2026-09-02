import { REPORT_HIDE_THRESHOLD } from '../../utils/moderation'
import { useSupabase } from '../../utils/supabase'
import type { Consultation } from '~/types/consultation'

/**
 * GET /api/consultations/:id
 * 個別の相談を返す（結果ページ・シェアURL用）。
 * URLを知っている人は非公開の投稿も閲覧できる仕様。
 * ただし一定件数以上通報された投稿は個別ページでも表示しない。
 */
export default defineEventHandler(async (event): Promise<Consultation> => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'IDが指定されていません' })
  }

  const supabase = useSupabase()
  const { data, error } = await supabase
    .from('consultations')
    .select('id, nickname, query, answer, is_public, likes, created_at')
    .eq('id', id)
    .lt('reports', REPORT_HIDE_THRESHOLD)
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
