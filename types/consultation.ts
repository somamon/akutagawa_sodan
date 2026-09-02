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

/** /api/ask が流す SSE メッセージ */
export type AskStreamMessage =
  | { type: 'delta'; text: string }
  | { type: 'done'; id: string | null }
  | { type: 'error'; message: string }
