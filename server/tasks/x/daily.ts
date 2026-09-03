import { postDailyConsultation } from '../../utils/xPost'

/**
 * 1日1回、公開相談から1件を X に投稿する。
 * 実行時刻は nuxt.config.ts の scheduledTasks で指定（毎日21時 JST）。
 * 手で流したいときは POST /api/tasks/x-daily（要 NUXT_TASK_SECRET）。
 */
export default defineTask({
  meta: {
    name: 'x:daily',
    description: '公開相談を1件Xへ投稿する',
  },
  async run() {
    const result = await postDailyConsultation()
    if (result.posted) {
      console.log('[x:daily] 投稿しました:', result.id)
    } else {
      console.log('[x:daily] 送信せず:', result.reason)
    }
    return { result }
  },
})
