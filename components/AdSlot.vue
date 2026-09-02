<script setup lang="ts">
/**
 * Google AdSense の広告枠。
 * NUXT_PUBLIC_ADSENSE_CLIENT_ID が未設定の間は何も描画しない
 * （審査申請前のサイトに空枠や偽広告を出さないため）。
 * 承認後は環境変数の設定と app.head への AdSense スクリプト追加だけで有効になる。
 */
const props = defineProps<{
  /** data-ad-slot に渡すスロットID（AdSense管理画面で発行） */
  adSlot?: string
}>()

const config = useRuntimeConfig()
const enabled = computed(() => Boolean(config.public.adsenseClientId && props.adSlot))

onMounted(() => {
  if (!enabled.value) return
  try {
    // @ts-expect-error AdSenseのグローバル
    ;(window.adsbygoogle = window.adsbygoogle || []).push({})
  } catch (e) {
    console.error('[AdSlot]', e)
  }
})
</script>

<template>
  <div v-if="enabled" class="my-6 text-center">
    <p class="mb-1 text-[10px] tracking-widest text-sepia/60">広告</p>
    <ins
      class="adsbygoogle block"
      :data-ad-client="config.public.adsenseClientId"
      :data-ad-slot="adSlot"
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  </div>
</template>
