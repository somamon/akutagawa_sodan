export default defineNuxtConfig({
  compatibilityDate: '2026-09-02',
  devtools: { enabled: true },

  modules: ['@nuxtjs/tailwindcss'],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'ja' },
      title: 'AI芥川龍之介の人生相談',
      meta: [
        { name: 'description', content: '文豪・芥川龍之介（AI）があなたの悩みに皮肉と諦念をもって答えます。' },
        { property: 'og:title', content: 'AI芥川龍之介の人生相談' },
        { property: 'og:description', content: '文豪・芥川龍之介（AI）があなたの悩みに皮肉と諦念をもって答えます。' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;500;700&display=swap',
        },
      ],
    },
  },

  runtimeConfig: {
    // NUXT_ANTHROPIC_API_KEY で上書き
    anthropicApiKey: '',
    // NUXT_SUPABASE_URL / NUXT_SUPABASE_SERVICE_KEY で上書き
    supabaseUrl: '',
    supabaseServiceKey: '',
    public: {
      // NUXT_PUBLIC_SITE_URL で上書き（Xシェア用の絶対URL生成に使用）
      siteUrl: 'http://localhost:3000',
      // NUXT_PUBLIC_ADSENSE_CLIENT_ID（例: ca-pub-XXXX）。空なら広告枠は一切表示されない
      adsenseClientId: '',
      // NUXT_PUBLIC_AMAZON_ASSOCIATE_TAG（例: xxxx-22）。空でも書籍リンクは出る（タグなし）
      amazonAssociateTag: '',
    },
  },
})
