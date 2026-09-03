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
        { property: 'og:site_name', content: 'AI芥川龍之介の人生相談' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'theme-color', content: '#1a2233' },
        // Google Search Console の所有権確認
        { name: 'google-site-verification', content: 'V8YbnVs_mFo2k5N1DsPrmmncamzY-2_HD_6kGLmuQHE' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;500;700&display=swap',
        },
      ],
    },
  },

  nitro: {
    // 毎日21時（JST）に公開相談を1件Xへ投稿する。
    // コンテナのTZはDockerfileで Asia/Tokyo に設定している。
    experimental: { tasks: true },
    scheduledTasks: { '0 21 * * *': ['x:daily'] },
  },

  runtimeConfig: {
    // NUXT_ANTHROPIC_API_KEY で上書き
    anthropicApiKey: '',
    // NUXT_SUPABASE_URL / NUXT_SUPABASE_SERVICE_KEY で上書き
    supabaseUrl: '',
    supabaseServiceKey: '',
    // X(Twitter) 自動投稿。未設定なら投稿処理は何もしない
    xApiKey: '',
    xApiSecret: '',
    xAccessToken: '',
    xAccessSecret: '',
    // 定期タスクを手動実行するときの合言葉（NUXT_TASK_SECRET）
    taskSecret: '',

    // ---- アプリ版の買い切り課金 ----
    // ストアに登録した商品ID（NUXT_IAP_PRODUCT_ID）
    iapProductId: 'work.akutagawa.app.pro',
    // レシート検証に使うアプリの識別情報
    iosBundleId: 'work.akutagawa.app',
    // App Store Connect のアプリID（数値）。本番レシートの検証に必須（NUXT_IOS_APP_APPLE_ID）
    iosAppAppleId: '',
    androidPackageName: 'work.akutagawa.app',
    // Play Console →「収益化のセットアップ」のライセンスキー（RSA公開鍵・base64）
    androidLicenseKey: '',

    // ---- 1日あたりの相談回数 ----
    // AI生成は1回ごとに実費がかかるため、購入後も上限を設けて原価を天井で止める
    // Web版（Cookieで識別・買い切りの導線なし）の上限（NUXT_WEB_DAILY_LIMIT）
    webDailyLimit: 5,
    freeDailyLimit: 3,
    proDailyLimit: 30,
    // 端末ID・Cookieを作り直して無料枠を取り直す乱用を鈍らせるための、回線単位の日次上限。
    // Web版にも掛かるようになったため、携帯キャリアのNAT配下（1つのIPを多数の利用者が共有）で
    // 善意の利用者を巻き込まないよう緩めに取っている（NUXT_IP_DAILY_LIMIT）
    ipDailyLimit: 300,

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
