<script setup lang="ts">
defineProps<{
  answer: string
  isStreaming?: boolean
}>()
</script>

<template>
  <section class="paper p-6 sm:p-8">
    <h2 class="mb-4 border-b border-sepia/30 pb-2 text-lg tracking-widest text-vermilion">芥川の返答</h2>
    <p
      class="manuscript whitespace-pre-wrap text-base"
      :class="{ 'typing-cursor': isStreaming }"
    >{{ answer }}</p>
  </section>
</template>
