import { REPORT_HIDE_THRESHOLD } from '../../utils/moderation'
import { useSupabase } from '../../utils/supabase'
import type { Consultation, ConsultationPage } from '~/types/consultation'

const PAGE_SIZE = 10
const MAX_PAGE_SIZE = 50

/**
 * GET /api/consultations?limit=10&before=<ISO日時>
 * 公開設定された相談を新しい順に返す（タイムライン用）。
 * created_at を使ったカーソル方式でページングする
 * （offset方式と違い、読み込み中に新規投稿があっても重複・欠落しない）。
 * 一定件数以上通報された投稿は表示しない。
 */
export default defineEventHandler(async (event): Promise<ConsultationPage> => {
  const { limit: rawLimit, before } = getQuery(event)

  const parsedLimit = Number.parseInt(String(rawLimit ?? ''), 10)
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), MAX_PAGE_SIZE)
    : PAGE_SIZE

  const supabase = useSupabase()

  let request = supabase
    .from('consultations')
    .select('id, nickname, query, answer, is_public, likes, created_at')
    .eq('is_public', true)
    .lt('reports', REPORT_HIDE_THRESHOLD)
    .order('created_at', { ascending: false })
    // 次ページの有無を判定するため1件多く取る
    .limit(limit + 1)

  if (before && typeof before === 'string' && !Number.isNaN(Date.parse(before))) {
    request = request.lt('created_at', before)
  }

  const { data, error } = await request

  if (error) {
    console.error('[consultations] 取得に失敗:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'タイムラインの取得に失敗しました',
    })
  }

  const rows = (data ?? []) as Consultation[]
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows

  return {
    items,
    hasMore,
    nextCursor: hasMore ? items[items.length - 1].created_at : null,
  }
})
