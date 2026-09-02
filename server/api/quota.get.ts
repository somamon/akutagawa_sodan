import { getQuotaStatus, resolveAskSubject } from '../utils/quota'

/**
 * GET /api/quota
 * 「残り何回相談できるか」と「購入済みかどうか」を返す。
 * アプリは端末IDで、WebはCookieで識別する（Cookieが無ければここで発行される）。
 */
export default defineEventHandler(async (event) => {
  return await getQuotaStatus(resolveAskSubject(event))
})
