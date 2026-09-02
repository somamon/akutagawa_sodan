/**
 * この件数以上通報された投稿はタイムライン・個別ページの両方から非表示になる。
 * 誤通報の復旧や完全な削除は Supabase Studio（consultations テーブル）で行う。
 */
export const REPORT_HIDE_THRESHOLD = 3
