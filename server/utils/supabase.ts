import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/**
 * サーバー専用の Supabase クライアント（service_role キー使用）。
 * DBへのアクセスはすべて Nitro の API ルート経由で行い、
 * キーをクライアントに露出させない。
 */
export function useSupabase(): SupabaseClient {
  if (client) return client

  const config = useRuntimeConfig()
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase の環境変数（NUXT_SUPABASE_URL / NUXT_SUPABASE_SERVICE_KEY）が設定されていません',
    })
  }

  client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false },
  })
  return client
}
