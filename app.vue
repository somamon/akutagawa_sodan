<script setup lang="ts">
const config = useRuntimeConfig()
const route = useRoute()

// canonical URL を全ページに付与する。
// Lightsail の既定URLでも同じ内容が配信されるため、これがないと
// 検索エンジンに重複コンテンツとみなされ評価が分散する。
useHead({
  link: [
    {
      rel: 'canonical',
      href: () => `${config.public.siteUrl}${route.path === '/' ? '' : route.path}`,
    },
  ],
})

// サイト全体の構造化データ（検索結果でのサイト名表示に使われる）
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'AI芥川龍之介の人生相談',
        url: config.public.siteUrl,
        description: '文豪・芥川龍之介（AI）があなたの悩みに皮肉と諦念をもって答えます。',
        inLanguage: 'ja',
      }),
    },
  ],
})

// AdSenseのクライアントIDが設定されている場合のみ広告スクリプトを読み込む
if (config.public.adsenseClientId) {
  useHead({
    script: [
      {
        src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.public.adsenseClientId}`,
        async: true,
        crossorigin: 'anonymous',
      },
    ],
  })
}
</script>

<template>
  <div class="min-h-screen bg-washi font-mincho text-ink">
    <header class="border-b border-sepia/30 py-6 text-center">
      <NuxtLink to="/" class="inline-flex flex-col items-center">
        <img
          src="/icon-192.png"
          alt=""
          width="72"
          height="72"
          class="mb-3 h-16 w-16 rounded-xl shadow-sm sm:h-[72px] sm:w-[72px]"
        >
        <!-- トップでは h1、下層ページでは各ページの見出しを h1 にするため p にする -->
        <component
          :is="route.path === '/' ? 'h1' : 'p'"
          class="text-2xl font-bold tracking-widest sm:text-3xl"
        >
          AI芥川龍之介の人生相談
        </component>
        <p class="mt-2 text-sm text-sepia">— 君の悩み、僕が冷徹に解剖しよう —</p>
      </NuxtLink>
    </header>

    <main class="mx-auto max-w-2xl px-4 py-8">
      <NuxtPage />
    </main>

    <footer class="space-y-3 border-t border-sepia/30 py-6 text-center text-xs text-sepia">
      <p>本サイトの回答はAIによる創作であり、実在した芥川龍之介の見解ではありません。</p>
      <nav class="flex justify-center gap-6">
        <NuxtLink to="/about" class="underline underline-offset-4 hover:text-vermilion">このサイトについて</NuxtLink>
        <NuxtLink to="/privacy" class="underline underline-offset-4 hover:text-vermilion">プライバシーポリシー</NuxtLink>
      </nav>
    </footer>
  </div>
</template>
