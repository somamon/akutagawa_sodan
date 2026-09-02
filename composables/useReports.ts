const STORAGE_KEY = 'akutagawa_reported_ids'

/**
 * 投稿の通報。通報済みIDを localStorage に記録して二重通報を抑止する
 * （加算とレート制限はサーバーAPI側で行う）。
 */
export function useReports() {
  const reportedIds = useState<string[]>('reported-ids', () => [])

  onMounted(() => {
    try {
      reportedIds.value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    } catch {
      reportedIds.value = []
    }
  })

  function hasReported(id: string): boolean {
    return reportedIds.value.includes(id)
  }

  /** 通報を送信する。通報済みなら何もしない */
  async function report(id: string): Promise<void> {
    if (hasReported(id)) return

    await $fetch(`/api/consultations/${id}/report`, { method: 'POST' })

    reportedIds.value = [...reportedIds.value, id]
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reportedIds.value))
    } catch {
      // localStorage が使えない環境では state のみで抑止する
    }
  }

  return { hasReported, report }
}
