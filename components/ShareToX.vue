<script setup lang="ts">
const props = defineProps<{
  consultationId: string
  text?: string
}>()

const config = useRuntimeConfig()

const shareUrl = computed(() => {
  const pageUrl = `${config.public.siteUrl}/result/${props.consultationId}`
  const params = new URLSearchParams({
    text: props.text ?? 'AI芥川龍之介に人生相談してみた',
    url: pageUrl,
    hashtags: 'AI芥川の人生相談',
  })
  return `https://twitter.com/intent/tweet?${params.toString()}`
})
</script>

<template>
  <a
    :href="shareUrl"
    target="_blank"
    rel="noopener noreferrer"
    class="inline-flex items-center gap-2 border border-ink px-5 py-2 text-sm tracking-wider transition hover:bg-ink hover:text-washi"
  >
    <span aria-hidden="true">𝕏</span>
    この回答をシェアする
  </a>
</template>
