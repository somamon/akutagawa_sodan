<script setup lang="ts">
const { answer, isStreaming, resultId, error, ask } = useAkutagawa()

// OGP画像は絶対URLである必要があるため、ここで設定する
const { siteUrl } = useRuntimeConfig().public
useSeoMeta({
  ogImage: `${siteUrl}/ogp.png`,
  ogUrl: siteUrl,
  twitterImage: `${siteUrl}/ogp.png`,
})

const submitted = ref(false)

async function onSubmit(payload: { nickname: string; query: string; isPublic: boolean }) {
  submitted.value = true
  await ask(payload)
}
</script>

<template>
  <div class="space-y-10">
    <ConsultationForm :disabled="isStreaming" @submit="onSubmit" />

    <AkutagawaAnswer v-if="submitted && (answer || isStreaming)" :answer="answer" :is-streaming="isStreaming" />

    <BookLinks v-if="answer && !isStreaming" :answer="answer" />

    <p v-if="error" class="text-center text-sm text-vermilion">{{ error }}</p>

    <div v-if="resultId && !isStreaming" class="flex flex-col items-center gap-3">
      <ShareToX :consultation-id="resultId" />
      <NuxtLink
        :to="`/result/${resultId}`"
        class="text-sm text-sepia underline underline-offset-4 hover:text-vermilion"
      >
        この相談の個別ページを開く
      </NuxtLink>
    </div>

    <hr class="border-sepia/30">

    <AdSlot ad-slot="3481591720" />

    <ConsultationTimeline />
  </div>
</template>
