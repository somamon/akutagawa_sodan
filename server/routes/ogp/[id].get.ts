import { REPORT_HIDE_THRESHOLD } from '../../utils/moderation'
import { renderConsultationOgp } from '../../utils/ogpImage'
import { useSupabase } from '../../utils/supabase'

/**
 * GET /ogp/:id.png
 * 相談ごとのシェア画像。X等のクローラーが読みに来る。
 * 内容は投稿後に変わらないので長めにキャッシュさせる。
 */
export default defineEventHandler(async (event) => {
  const raw = getRouterParam(event, 'id') ?? ''
  const id = raw.replace(/\.png$/, '')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'IDが指定されていません' })
  }

  const supabase = useSupabase()
  const { data, error } = await supabase
    .from('consultations')
    .select('nickname, query, answer')
    .eq('id', id)
    .lt('reports', REPORT_HIDE_THRESHOLD)
    .maybeSingle()

  if (error) {
    console.error('[ogp] 相談の取得に失敗:', error)
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error', message: '画像の生成に失敗しました' })
  }
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'その相談は見当たらない' })
  }

  const png = await renderConsultationOgp(data)

  setHeader(event, 'Content-Type', 'image/png')
  setHeader(event, 'Cache-Control', 'public, max-age=86400, s-maxage=604800, immutable')
  return png
})
