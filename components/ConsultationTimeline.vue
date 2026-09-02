<script setup lang="ts">
import type { Consultation, ConsultationPage } from '~/types/consultation'

const { data: firstPage, status, error } = await useFetch<ConsultationPage>('/api/consultations', {
  lazy: true,
})

/** 2ページ目以降に読み足した分 */
const loadedMore = ref<Consultation[]>([])
const cursor = ref<string | null>(null)
const hasMore = ref(false)
const loadingMore = ref(false)
const loadMoreError = ref(false)

// 初回ロード（およびリフレッシュ）に追従して状態を初期化する
watch(
  firstPage,
  (page: ConsultationPage | null) => {
    loadedMore.value = []
    cursor.value = page?.nextCursor ?? null
    hasMore.value = page?.hasMore ?? false
  },
  { immediate: true },
)

const consultations = computed(() => [...(firstPage.value?.items ?? []), ...loadedMore.value])

async function loadMore() {
  if (loadingMore.value || !hasMore.value || !cursor.value) return

  loadingMore.value = true
  loadMoreError.value = false
  try {
    const page = await $fetch<ConsultationPage>('/api/consultations', {
      query: { before: cursor.value },
    })
    loadedMore.value = [...loadedMore.value, ...page.items]
    cursor.value = page.nextCursor
    hasMore.value = page.hasMore
  } catch (e) {
    console.error('[ConsultationTimeline] 追加読み込みに失敗:', e)
    loadMoreError.value = true
  } finally {
    loadingMore.value = false
  }
}
</script>

<template>
  <section>
    <h2 class="mb-6 text-center text-xl tracking-widest">みんなの悩みと芥川の回答</h2>

    <p v-if="status === 'pending'" class="text-center text-sm text-sepia">読み込み中……</p>
    <p v-else-if="error" class="text-center text-sm text-vermilion">
      掲示板の取得に失敗した。時を置いて、また訪ねてくれたまえ。
    </p>
    <p v-else-if="!consultations.length" class="text-center text-sm text-sepia">
      まだ誰も悩みを打ち明けていない。君が最初の一人になりたまえ。
    </p>

    <template v-else>
      <div class="space-y-4">
        <ConsultationCard
          v-for="consultation in consultations"
          :key="consultation.id"
          :consultation="consultation"
        />
      </div>

      <div v-if="hasMore" class="mt-6 text-center">
        <button
          type="button"
          :disabled="loadingMore"
          class="border border-sepia/50 px-6 py-2 text-sm tracking-wider transition hover:border-vermilion hover:text-vermilion disabled:opacity-50"
          @click="loadMore"
        >
          {{ loadingMore ? '頁を繰っている……' : 'もっと読む' }}
        </button>
        <p v-if="loadMoreError" class="mt-2 text-sm text-vermilion">
          続きを読み込めなかった。今一度試してくれたまえ。
        </p>
      </div>
      <p v-else class="mt-6 text-center text-xs text-sepia/60">――以上、みな悩める者たちである――</p>
    </template>
  </section>
</template>
