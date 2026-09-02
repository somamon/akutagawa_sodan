import { checkRateLimit } from '../../../utils/rateLimit'
import { useSupabase } from '../../../utils/supabase'

/**
 * POST /api/consultations/:id/report
 * 投稿を通報する。REPORT_HIDE_THRESHOLD 件に達すると
 * タイムライン・個別ページの両方から非表示になる（削除はStudioで行う）。
 */
export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'IDが指定されていません' })
  }

  checkRateLimit(event, {
    name: 'report',
    limit: 5,
    windowMs: 60 * 1000,
    message: '通報が多すぎる。本当に必要なものだけにしたまえ。',
  })

  const supabase = useSupabase()
  const { error } = await supabase.rpc('increment_reports', { consultation_id: id })

  if (error) {
    console.error('[report] 通報に失敗:', error)
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error', message: '通報に失敗しました' })
  }

  return { ok: true }
})
