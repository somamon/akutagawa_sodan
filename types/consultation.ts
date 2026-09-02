export interface Consultation {
  id: string
  nickname: string
  query: string
  answer: string
  is_public: boolean
  likes: number
  created_at: string
}

/** /api/consultations の1ページ分 */
export interface ConsultationPage {
  items: Consultation[]
  hasMore: boolean
  /** 次ページ取得に使う created_at。これ以上ない場合は null */
  nextCursor: string | null
}

/** 1日あたりの相談回数。Web版・アプリ版のどちらにも返る */
export interface AskQuota {
  isPro: boolean
  limit: number
  remaining: number
}

/** /api/ask が流す SSE メッセージ */
export type AskStreamMessage =
  | { type: 'delta'; text: string }
  | { type: 'done'; id: string | null; quota?: AskQuota }
  | { type: 'error'; message: string }
