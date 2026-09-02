# AI芥川龍之介の人生相談

文豪・芥川龍之介（AI）が、皮肉と冷徹な観察眼であなたの悩みに答えるWebアプリ。

## 技術スタック

- **Nuxt 3** (Vue 3) + **Tailwind CSS**（レトロ原稿用紙風UI）
- **Anthropic API**（`claude-opus-5`・SSEストリーミングでタイピング演出）
- **Supabase**（相談・回答・いいねの永続化）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Supabase プロジェクトの作成

1. [Supabase](https://supabase.com/dashboard) でプロジェクトを作成
2. SQL Editor で `supabase/migrations/0001_create_consultations.sql` を実行
3. Settings > API から URL と `service_role` キーを控える

### 3. 環境変数の設定

```bash
cp .env.example .env
```

`.env` に Anthropic APIキー・Supabase の URL / service_role キーを記入。

### 4. 起動

```bash
npm run dev
```

http://localhost:3000 を開く。

## ディレクトリ構成

```
├── pages/
│   ├── index.vue              # トップ：相談フォーム + 回答表示 + タイムライン
│   └── result/[id].vue        # 個別詳細ページ（Xシェア対応）
├── components/
│   ├── ConsultationForm.vue   # 相談フォーム（ペンネーム / 悩み / 公開チェック）
│   ├── AkutagawaAnswer.vue    # 回答表示（原稿用紙風・タイピングカーソル）
│   ├── ConsultationTimeline.vue # みんなの相談タイムライン
│   ├── ConsultationCard.vue   # タイムラインの1件（いいねボタン付き）
│   └── ShareToX.vue           # X(Twitter)シェアボタン
├── composables/
│   ├── useAkutagawa.ts        # /api/ask のSSEを消費して回答を蓄積
│   └── useLikes.ts            # いいねの1人1回制御（localStorage）
├── server/
│   ├── api/
│   │   ├── ask.post.ts        # AI回答生成（SSEストリーミング）+ 保存
│   │   └── consultations/
│   │       ├── index.get.ts   # 公開相談の一覧
│   │       ├── [id].get.ts    # 個別取得
│   │       └── [id]/like.post.ts # いいね加算
│   └── utils/
│       ├── akutagawaPersona.ts # 芥川ペルソナのシステムプロンプト
│       └── supabase.ts        # サーバー専用Supabaseクライアント
├── supabase/migrations/       # テーブル・関数の作成SQL
└── types/consultation.ts      # 共有型定義
```

## 設計メモ

- **Supabaseへのアクセスはすべてサーバー側**（service_role キー使用、RLSで anon 全拒否）。クライアントにキーは露出しない。
- **非公開の相談も保存**する。`is_public` はタイムラインへの表示可否のみを制御し、個別URL・Xシェアは非公開でも機能する。
- **いいね**はSQL関数 `increment_likes` でアトミックに加算。「1人1回」はブラウザの localStorage で制御（厳密な重複排除ではない）。
- AI回答が安全分類器に拒否された場合に備え、サーバーサイドフォールバック（`fallbacks: "default"`）を有効化している。
