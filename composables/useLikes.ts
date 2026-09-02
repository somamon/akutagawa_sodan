const STORAGE_KEY = 'akutagawa_liked_ids'

/**
 * いいねの「1人1回」制御。
 * 押下済みIDを localStorage に記録し、加算自体はサーバーAPIで行う。
 */
export function useLikes() {
  const likedIds = useState<string[]>('liked-ids', () => [])

  onMounted(() => {
    try {
      likedIds.value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    } catch {
      likedIds.value = []
    }
  })

  function hasLiked(id: string): boolean {
    return likedIds.value.includes(id)
  }

  /** いいねを送信し、加算後の件数を返す。押下済みなら null を返す */
  async function like(id: string): Promise<number | null> {
    if (hasLiked(id)) return null

    const { likes } = await $fetch<{ likes: number }>(`/api/consultations/${id}/like`, {
      method: 'POST',
    })

    likedIds.value = [...likedIds.value, id]
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(likedIds.value))
    } catch {
      // localStorage が使えない環境では state のみで抑止する
    }

    return likes
  }

  return { hasLiked, like }
}
