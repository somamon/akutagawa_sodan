import { postDailyConsultation } from '../../utils/xPost'

/**
 * POST /api/tasks/x-daily
 * 定期実行を待たずに手動で1件投稿する（動作確認・臨時投稿用）。
 * NUXT_TASK_SECRET を Authorization: Bearer で渡すこと。
 */
export default defineEventHandler(async (event) => {
  const secret = useRuntimeConfig().taskSecret
  if (!secret) {
    throw createError({ statusCode: 503, statusMessage: 'Service Unavailable', message: 'NUXT_TASK_SECRET が未設定です' })
  }

  const provided = getHeader(event, 'authorization')?.replace(/^Bearer\s+/i, '')
  if (provided !== secret) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: '認証に失敗しました' })
  }

  return await postDailyConsultation()
})
