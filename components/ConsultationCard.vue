<script setup lang="ts">
import type { Consultation } from '~/types/consultation'

const props = defineProps<{
  consultation: Consultation
}>()

const { hasLiked, like } = useLikes()
const { hasReported, report } = useReports()

const likeCount = ref(props.consultation.likes)
const liked = computed(() => hasLiked(props.consultation.id))
const reported = computed(() => hasReported(props.consultation.id))

async function onLike() {
  try {
    const updated = await like(props.consultation.id)
    if (updated !== null) likeCount.value = updated
  } catch (e) {
    console.error('[ConsultationCard] いいねに失敗:', e)
  }
}

async function onReport() {
  if (reported.value) return
  if (!window.confirm('この投稿を不適切な内容として通報しますか？')) return
  try {
    await report(props.consultation.id)
  } catch (e) {
    console.error('[ConsultationCard] 通報に失敗:', e)
  }
}

function truncate(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length)}……` : text
}
</script>

<template>
  <article class="paper p-5">
    <div class="mb-2 flex items-baseline justify-between gap-2">
      <span class="text-sm font-bold">{{ consultation.nickname }} の悩み</span>
      <time class="shrink-0 text-xs text-sepia">
        {{ new Date(consultation.created_at).toLocaleDateString('ja-JP') }}
      </time>
    </div>

    <p class="mb-3 text-sm text-ink/80">{{ truncate(consultation.query, 80) }}</p>

    <div class="border-l-2 border-vermilion/60 pl-3">
      <p class="text-sm">{{ truncate(consultation.answer, 120) }}</p>
    </div>

    <div class="mt-4 flex items-center justify-between">
      <button
        type="button"
        :disabled="liked"
        class="text-sm transition disabled:cursor-default"
        :class="liked ? 'text-vermilion' : 'text-sepia hover:text-vermilion'"
        @click="onLike"
      >
        {{ liked ? '♥' : '♡' }} 共感 {{ likeCount }}
      </button>
      <div class="flex items-center gap-4">
        <button
          type="button"
          :disabled="reported"
          class="text-xs text-sepia/60 transition hover:text-vermilion disabled:cursor-default disabled:hover:text-sepia/60"
          @click="onReport"
        >
          {{ reported ? '通報済み' : '通報' }}
        </button>
        <NuxtLink
          :to="`/result/${consultation.id}`"
          class="text-sm text-sepia underline underline-offset-4 hover:text-vermilion"
        >
          全文を読む
        </NuxtLink>
      </div>
    </div>
  </article>
</template>
