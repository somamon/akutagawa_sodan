<script setup lang="ts">
import type { Consultation } from '~/types/consultation'

const route = useRoute()
const id = route.params.id as string

const { data: consultation, error } = await useFetch<Consultation>(`/api/consultations/${id}`)

if (error.value) {
  throw createError({ statusCode: error.value.statusCode ?? 500, statusMessage: 'その相談は見当たらない' })
}

const config = useRuntimeConfig()

/** 検索結果で内容が伝わるよう、相談文そのものを見出しに使う */
const querySummary = computed(() => {
  const query = consultation.value?.query ?? ''
  return query.length > 40 ? `${query.slice(0, 40)}……` : query
})

const pageTitle = computed(() =>
  consultation.value
    ? `「${querySummary.value}」芥川龍之介の回答 | AI芥川龍之介の人生相談`
    : 'AI芥川龍之介の人生相談',
)
const pageDescription = computed(() =>
  consultation.value ? `${consultation.value.answer.slice(0, 90)}……` : '',
)
const pageUrl = `${config.public.siteUrl}/result/${id}`

useHead(() => ({ title: pageTitle.value }))
useSeoMeta({
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogType: 'article',
  ogUrl: pageUrl,
  ogImage: `${config.public.siteUrl}/ogp.png`,
  twitterImage: `${config.public.siteUrl}/ogp.png`,
  twitterCard: 'summary_large_image',
})

// 質問と回答の構造化データ。検索結果でQ&A形式のリッチリザルト対象になる
useHead(() => ({
  script: consultation.value
    ? [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'QAPage',
            mainEntity: {
              '@type': 'Question',
              name: querySummary.value,
              text: consultation.value.query,
              answerCount: 1,
              datePublished: consultation.value.created_at,
              author: { '@type': 'Person', name: consultation.value.nickname },
              acceptedAnswer: {
                '@type': 'Answer',
                text: consultation.value.answer,
                url: pageUrl,
                upvoteCount: consultation.value.likes,
                datePublished: consultation.value.created_at,
                author: { '@type': 'Person', name: 'AI芥川龍之介' },
              },
            },
          }),
        },
      ]
    : [],
}))
</script>

<template>
  <div v-if="consultation" class="space-y-8">
    <section class="paper p-6 sm:p-8">
      <h1 class="mb-4 border-b border-sepia/30 pb-2 text-lg leading-relaxed tracking-widest">
        {{ consultation.nickname }} の悩み
      </h1>
      <p class="whitespace-pre-wrap">{{ consultation.query }}</p>
    </section>

    <AkutagawaAnswer :answer="consultation.answer" />

    <BookLinks :answer="consultation.answer" />

    <!-- AdSense承認後、発行されたスロットIDを ad-slot に記入 -->
    <AdSlot ad-slot="" />

    <div class="flex flex-col items-center gap-4">
      <ShareToX
        :consultation-id="consultation.id"
        :text="`「${consultation.query.slice(0, 40)}」…AI芥川龍之介の回答は`"
      />
      <NuxtLink to="/" class="text-sm text-sepia underline underline-offset-4 hover:text-vermilion">
        自分も相談してみる
      </NuxtLink>
    </div>
  </div>
</template>
