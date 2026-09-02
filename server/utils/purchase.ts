import { createVerify } from 'node:crypto'
import { Environment, SignedDataVerifier } from '@apple/app-store-server-library'
import { APPLE_ROOT_CERTIFICATES } from './appleRootCa'

/**
 * アプリ内課金（買い切り）のレシート検証。
 *
 * 検証は必ずサーバーで行う。アプリ側の「購入済み」フラグを信じると、
 * 端末を触れる者は誰でも相談回数の上限を外せてしまうため。
 *
 * - iOS  : StoreKit 2 が返す JWS を Apple のルート証明書まで遡って検証する（Appleへの鍵は不要）
 * - Android: Play が返す originalJson を、Play Console の RSA 公開鍵で署名検証する
 */
export interface VerifiedPurchase {
  platform: 'ios' | 'android'
  /** レシート1件を一意に指すID。これを主キーにして二重付与を防ぐ */
  transactionId: string
  originalTransactionId: string | null
  productId: string
  /** ISO8601。取得できなければ null */
  purchasedAt: string | null
}

/** 検証に失敗した理由を日本語で持つエラー（そのまま画面に出してよい） */
export class PurchaseVerificationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PurchaseVerificationError'
  }
}

function invalid(reason: string): never {
  throw new PurchaseVerificationError(reason)
}

/**
 * iOS: JWS を検証する。
 * 本番とサンドボックス（TestFlight・開発中）でレシートの発行元が異なるため、
 * 本番用の検証器で弾かれたらサンドボックス用でもう一度試す。
 */
async function verifyApple(signedTransaction: string): Promise<VerifiedPurchase> {
  const config = useRuntimeConfig()
  const bundleId = config.iosBundleId
  if (!bundleId) {
    throw createError({ statusCode: 500, statusMessage: 'NUXT_IOS_BUNDLE_ID が設定されていません' })
  }

  // appAppleId は本番レシートの検証に必須（App Store Connect のアプリID）
  const appAppleId = Number(config.iosAppAppleId) || undefined

  const verifiers: SignedDataVerifier[] = []
  if (appAppleId) {
    verifiers.push(
      new SignedDataVerifier(
        APPLE_ROOT_CERTIFICATES,
        true,
        Environment.PRODUCTION,
        bundleId,
        appAppleId,
      ),
    )
  }
  verifiers.push(
    new SignedDataVerifier(APPLE_ROOT_CERTIFICATES, true, Environment.SANDBOX, bundleId),
  )

  let lastError: unknown = null
  for (const verifier of verifiers) {
    try {
      const payload = await verifier.verifyAndDecodeTransaction(signedTransaction)

      if (payload.revocationDate) {
        invalid('この購入は払い戻し済みだ。')
      }
      if (!payload.transactionId || !payload.productId) {
        invalid('レシートの内容が読み取れなかった。')
      }

      return {
        platform: 'ios',
        transactionId: payload.transactionId,
        originalTransactionId: payload.originalTransactionId ?? null,
        productId: payload.productId,
        purchasedAt: payload.purchaseDate ? new Date(payload.purchaseDate).toISOString() : null,
      }
    } catch (error) {
      if (error instanceof PurchaseVerificationError) throw error
      lastError = error
    }
  }

  console.error('[purchase] Apple のレシート検証に失敗:', lastError)
  return invalid('レシートを確認できなかった。')
}

interface PlayReceipt {
  orderId?: string
  packageName?: string
  productId?: string
  purchaseTime?: number
  /** 0 = 購入済み、1 = キャンセル、2 = 保留 */
  purchaseState?: number
  purchaseToken?: string
}

/**
 * Android: Play が返す originalJson とその署名を、
 * Play Console の「ライセンスキー」（RSA公開鍵・base64のDER）で検証する。
 * 署名アルゴリズムは Play の仕様どおり SHA1withRSA。
 */
function verifyGoogle(data: string, signature: string): VerifiedPurchase {
  const config = useRuntimeConfig()
  const licenseKey = config.androidLicenseKey
  if (!licenseKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_ANDROID_LICENSE_KEY が設定されていません',
    })
  }

  const publicKey = `-----BEGIN PUBLIC KEY-----\n${
    licenseKey.replace(/\s+/g, '').match(/.{1,64}/g)?.join('\n') ?? ''
  }\n-----END PUBLIC KEY-----\n`

  let verified = false
  try {
    verified = createVerify('RSA-SHA1').update(data, 'utf8').verify(publicKey, signature, 'base64')
  } catch (error) {
    console.error('[purchase] Google の署名検証でエラー:', error)
  }
  if (!verified) invalid('レシートの署名が確認できなかった。')

  let receipt: PlayReceipt
  try {
    receipt = JSON.parse(data) as PlayReceipt
  } catch {
    return invalid('レシートの内容が読み取れなかった。')
  }

  if (receipt.packageName !== config.androidPackageName) {
    invalid('このアプリの購入ではないようだ。')
  }
  if (receipt.purchaseState !== 0) {
    invalid('購入がまだ完了していない。')
  }
  if (!receipt.productId) invalid('レシートの内容が読み取れなかった。')

  // orderId はテスト購入などで欠けることがあるので purchaseToken を代わりに使う
  const transactionId = receipt.orderId || receipt.purchaseToken
  if (!transactionId) invalid('レシートの内容が読み取れなかった。')

  return {
    platform: 'android',
    transactionId,
    originalTransactionId: receipt.purchaseToken ?? null,
    productId: receipt.productId,
    purchasedAt: receipt.purchaseTime ? new Date(receipt.purchaseTime).toISOString() : null,
  }
}

export interface VerifyPurchaseInput {
  platform: 'ios' | 'android'
  /** iOS: StoreKit の JWS / Android: Play の purchaseToken（Androidでは未使用） */
  purchaseToken?: string
  /** Android: originalJson */
  data?: string
  /** Android: originalJson の署名 */
  signature?: string
}

/** プラットフォームごとの検証を振り分け、売っている商品かどうかまで確かめる */
export async function verifyPurchase(input: VerifyPurchaseInput): Promise<VerifiedPurchase> {
  const config = useRuntimeConfig()

  const verified =
    input.platform === 'ios'
      ? await verifyApple(input.purchaseToken || invalid('レシートが空だ。'))
      : verifyGoogle(
          input.data || invalid('レシートが空だ。'),
          input.signature || invalid('レシートの署名が空だ。'),
        )

  if (config.iapProductId && verified.productId !== config.iapProductId) {
    invalid('取り扱っていない商品だ。')
  }

  return verified
}
