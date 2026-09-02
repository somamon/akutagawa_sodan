<script setup lang="ts">
/**
 * 回答文中で言及された芥川作品を検出し、Amazonの書籍検索リンクを表示する。
 * NUXT_PUBLIC_AMAZON_ASSOCIATE_TAG が設定されていればアソシエイトタグを付与
 * （未設定でもリンク自体は機能する）。
 */
const props = defineProps<{
  answer: string
}>()

// 検出対象の代表作（『侏儒の言葉』等の評論・随筆含む）
const KNOWN_WORKS = [
  '羅生門', '鼻', '地獄変', '蜘蛛の糸', '河童', '侏儒の言葉',
  '或阿呆の一生', '歯車', '藪の中', '杜子春', 'トロッコ',
  '奉教人の死', '芋粥', '舞踏会', '秋', '六の宮の姫君', '戯作三昧',
] as const

const config = useRuntimeConfig()

const mentionedWorks = computed(() =>
  KNOWN_WORKS.filter((work) => props.answer.includes(`『${work}』`)),
)

function amazonUrl(work: string): string {
  const params = new URLSearchParams({ k: `芥川龍之介 ${work}` })
  const tag = config.public.amazonAssociateTag
  if (tag) params.set('tag', tag)
  return `https://www.amazon.co.jp/s?${params.toString()}`
}
</script>

<template>
  <aside v-if="mentionedWorks.length" class="paper mt-4 p-4">
    <p class="mb-2 text-xs tracking-widest text-sepia">回答で言及された作品</p>
    <ul class="flex flex-wrap gap-2">
      <li v-for="work in mentionedWorks" :key="work">
        <a
          :href="amazonUrl(work)"
          target="_blank"
          rel="noopener noreferrer nofollow sponsored"
          class="inline-block border border-sepia/40 px-3 py-1 text-sm transition hover:border-vermilion hover:text-vermilion"
        >
          『{{ work }}』を読む
        </a>
      </li>
    </ul>
    <p v-if="config.public.amazonAssociateTag" class="mt-2 text-[10px] text-sepia/60">
      Amazonのアソシエイトとして、当サイトは適格販売により収入を得ています。
    </p>
  </aside>
</template>
