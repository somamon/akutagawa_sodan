import { REPORT_HIDE_THRESHOLD } from '../../utils/moderation'
import { useSupabase } from '../../utils/supabase'
import type { Consultation } from '~/types/consultation'

/**
 * GET /api/consultations
 * 公開設定された相談を新しい順に返す（タイムライン用）。
 * 一定件数以上通報された投稿は表示しない。
 */
export default defineEventHandler(async (): Promise<Consultation[]> => {
  const supabase = useSupabase()

  const { data, error } = await supabase
    .from('consultations')
    .select('id, nickname, query, answer, is_public, likes, created_at')
    .eq('is_public', true)
    .lt('reports', REPORT_HIDE_THRESHOLD)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[consultations] 取得に失敗:', error)
    throw createError({ statusCode: 500, statusMessage: 'タイムラインの取得に失敗しました' })
  }

  return data as Consultation[]
})
