import { verifyPurchase, PurchaseVerificationError } from '../../utils/purchase'
import { getDeviceId, getQuotaStatus, grantEntitlement } from '../../utils/quota'
import { checkRateLimit } from '../../utils/rateLimit'

interface VerifyBody {
  platform?: 'ios' | 'android'
  /** iOS: StoreKit 2 の JWS */
  purchaseToken?: string
  /** Android: originalJson とその署名 */
  data?: string
  signature?: string
}

/**
 * POST /api/purchase/verify
 * アプリから届いたレシートを検証し、端末に買い切りの権利を紐付ける。
 * 購入直後と「購入を復元」の両方から呼ばれる（同じレシートで何度呼んでも同じ結果になる）。
 */
export default defineEventHandler(async (event) => {
  const deviceId = getDeviceId(event)
  if (!deviceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: '端末を識別できなかった。アプリを再起動して試してくれたまえ。',
    })
  }

  // 総当たりで偽のレシートを試されないよう抑える
  checkRateLimit(event, {
    name: 'purchase-verify',
    limit: 20,
    windowMs: 10 * 60 * 1000,
    message: '確認の要求が多すぎる。しばし待ちたまえ。',
  })

  const body = await readBody<VerifyBody>(event)
  if (body?.platform !== 'ios' && body?.platform !== 'android') {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: '不正な要求だ。' })
  }

  try {
    const purchase = await verifyPurchase({
      platform: body.platform,
      purchaseToken: body.purchaseToken,
      data: body.data,
      signature: body.signature,
    })
    await grantEntitlement(deviceId, purchase)
  } catch (error) {
    if (error instanceof PurchaseVerificationError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: error.message,
      })
    }
    throw error
  }

  return await getQuotaStatus({ kind: 'app', id: deviceId })
})
