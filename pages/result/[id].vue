<script setup lang="ts">
import type { Consultation } from '~/types/consultation'

const route = useRoute()
const id = route.params.id as string

const { data: consultation, error } = await useFetch<Consultation>(`/api/consultations/${id}`)

if (error.value) {
  throw createError({ statusCode: error.value.statusCode ?? 500, statusMessage: 'その相談は見当たらない' })
}

useHead(() => ({
  title: consultation.value
    ? `${consultation.value.nickname}の悩み | AI芥川龍之介の人生相談`
    : 'AI芥川龍之介の人生相談',
}))
</script>

<template>
  <div v-if="consultation" class="space-y-8">
    <section class="paper p-6 sm:p-8">
      <h2 class="mb-4 border-b border-sepia/30 pb-2 text-lg tracking-widest">
        {{ consultation.nickname }} の悩み
      </h2>
      <p class="whitespace-pre-wrap">{{ consultation.query }}</p>
    </section>

    <AkutagawaAnswer :answer="consultation.answer" />

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
