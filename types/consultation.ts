export interface Consultation {
  id: string
  nickname: string
  query: string
  answer: string
  is_public: boolean
  likes: number
  created_at: string
}

/** /api/ask が流す SSE メッセージ */
export type AskStreamMessage =
  | { type: 'delta'; text: string }
  | { type: 'done'; id: string | null }
  | { type: 'error'; message: string }
