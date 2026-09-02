<script setup lang="ts">
import type { Consultation } from '~/types/consultation'

const { data: consultations, status, error } = useFetch<Consultation[]>('/api/consultations', {
  lazy: true,
})
</script>

<template>
  <section>
    <h2 class="mb-6 text-center text-xl tracking-widest">みんなの悩みと芥川の回答</h2>

    <p v-if="status === 'pending'" class="text-center text-sm text-sepia">読み込み中……</p>
    <p v-else-if="error" class="text-center text-sm text-vermilion">
      掲示板の取得に失敗した。時を置いて、また訪ねてくれたまえ。
    </p>
    <p v-else-if="!consultations?.length" class="text-center text-sm text-sepia">
      まだ誰も悩みを打ち明けていない。君が最初の一人になりたまえ。
    </p>

    <div v-else class="space-y-4">
      <ConsultationCard
        v-for="consultation in consultations"
        :key="consultation.id"
        :consultation="consultation"
      />
    </div>
  </section>
</template>
