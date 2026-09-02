import type { AskStreamMessage } from '~/types/consultation'

/**
 * /api/ask の SSE ストリームを消費し、回答を1文字ずつ蓄積する。
 */
export function useAkutagawa() {
  const answer = ref('')
  const isStreaming = ref(false)
  const resultId = ref<string | null>(null)
  const error = ref<string | null>(null)

  async function ask(payload: { nickname: string; query: string; isPublic: boolean }) {
    answer.value = ''
    resultId.value = null
    error.value = null
    isStreaming.value = true

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok || !response.body) {
        throw new Error(`リクエストに失敗しました (${response.status})`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE は空行区切り。末尾の未完チャンクは buffer に残す
        const events = buffer.split(/\r?\n\r?\n/)
        buffer = events.pop() ?? ''

        for (const rawEvent of events) {
          for (const line of rawEvent.split(/\r?\n/)) {
            if (!line.startsWith('data:')) continue
            const message = parseMessage(line.slice(5).trim())
            if (!message) continue

            if (message.type === 'delta') {
              answer.value += message.text
            } else if (message.type === 'done') {
              resultId.value = message.id
            } else if (message.type === 'error') {
              error.value = message.message
            }
          }
        }
      }
    } catch (e) {
      console.error('[useAkutagawa]', e)
      error.value = '芥川との通信が途絶えた。時を置いて、また試してくれたまえ。'
    } finally {
      isStreaming.value = false
    }
  }

  function parseMessage(data: string): AskStreamMessage | null {
    try {
      return JSON.parse(data) as AskStreamMessage
    } catch {
      return null
    }
  }

  return { answer, isStreaming, resultId, error, ask }
}
