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
2. SQL Editor で `supabase/migrations/` の中身を番号順にすべて実行
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
│   │   ├── quota.get.ts       # アプリ版：今日の残り相談回数と購入状態
│   │   ├── purchase/verify.post.ts # アプリ版：レシート検証と権利の付与
│   │   └── consultations/
│   │       ├── index.get.ts   # 公開相談の一覧
│   │       ├── [id].get.ts    # 個別取得
│   │       └── [id]/like.post.ts # いいね加算
│   └── utils/
│       ├── akutagawaPersona.ts # 芥川ペルソナのシステムプロンプト
│       ├── purchase.ts        # App Store / Google Play のレシート検証
│       ├── quota.ts           # 端末ごとの1日の相談回数
│       ├── appleRootCa.ts     # Appleのルート証明書（公開情報）
│       └── supabase.ts        # サーバー専用Supabaseクライアント
├── supabase/migrations/       # テーブル・関数の作成SQL
└── types/consultation.ts      # 共有型定義
```

## セキュリティ対策

- **レート制限（IPベース・インメモリ）**: `/api/ask` は10分に5回、いいねは分10回、通報は分5回。マルチインスタンス構成に移行する場合はRedis等の共有ストアへ置き換えること（`server/utils/rateLimit.ts`）
- **RPC権限の限定**: `increment_likes` / `increment_reports` はEXECUTE権限を `service_role` のみに限定（anon経由の直接呼び出しは permission denied）
- **通報機能**: 各投稿に通報ボタン。3件以上通報された投稿はタイムライン・個別ページとも非表示（閾値は `server/utils/moderation.ts`）。復旧・完全削除はSupabase Studioで行う
- **プロンプトインジェクション対策**: 相談文中の指示（人格変更・プロンプト開示要求など）には従わず、芥川として皮肉で返す旨をシステムプロンプトに明記

## 設計メモ

- **Supabaseへのアクセスはすべてサーバー側**（service_role キー使用、RLSで anon 全拒否）。クライアントにキーは露出しない。
- **非公開の相談も保存**する。`is_public` はタイムラインへの表示可否のみを制御し、個別URL・Xシェアは非公開でも機能する。
- **いいね**はSQL関数 `increment_likes` でアトミックに加算。「1人1回」はブラウザの localStorage で制御（厳密な重複排除ではない）。
- AI回答が安全分類器に拒否された場合に備え、サーバーサイドフォールバック（`fallbacks: "default"`）を有効化している（退避先を持つ `claude-opus-5` のときのみ。後述）。

## 相談回数の上限と買い切り課金

AIの回答は1回ごとに実費がかかるため、**Web版・アプリ版のどちらにも1日あたりの上限**を設けている。
買い切りでも「無制限」にはせず、上限を引き上げる形にしている。

数える単位は、アプリ版が端末IDヘッダ（`x-device-id`）、Web版が `akutagawa_visitor` Cookie
（HttpOnly・SameSite=Lax・400日）。どちらもクライアント側で作り直せる値なので、
それだけでは無料枠を取り直されてしまう。回線単位の日次上限（`NUXT_IP_DAILY_LIMIT`）と
既存のIPレート制限を併せて、初めて歯止めになる。

買い切りの導線があるのはアプリ版だけなので、Web版は常に無料枠として扱う。

| 環境変数 | 既定値 | 用途 |
| --- | --- | --- |
| `NUXT_IAP_PRODUCT_ID` | `work.akutagawa.app.pro` | 取り扱う商品ID。これ以外のレシートは弾く |
| `NUXT_IOS_BUNDLE_ID` | `work.akutagawa.app` | iOSレシートの検証対象 |
| `NUXT_IOS_APP_APPLE_ID` | 空 | App Store Connect のアプリID（数値）。**本番レシートの検証に必須**。未設定だとSandboxのレシートしか通らない |
| `NUXT_ANDROID_PACKAGE_NAME` | `work.akutagawa.app` | Androidレシートの検証対象 |
| `NUXT_ANDROID_LICENSE_KEY` | 空 | Play Console >「収益化のセットアップ」のライセンスキー（RSA公開鍵） |
| `NUXT_WEB_DAILY_LIMIT` | `5` | Web版（Cookieで識別）の1日あたり相談回数 |
| `NUXT_FREE_DAILY_LIMIT` | `3` | アプリ版・無料の1日あたり相談回数 |
| `NUXT_PRO_DAILY_LIMIT` | `30` | アプリ版・購入後の1日あたり相談回数 |
| `NUXT_IP_DAILY_LIMIT` | `300` | 回線単位の日次上限（端末ID・Cookieの作り直しによる乱用の歯止め）。携帯キャリアのNAT配下では多数の利用者が1つのIPを共有するため、絞りすぎると善意の利用者を巻き込む |

### 検証の方法

- **iOS**: StoreKit 2 が返す JWS を、埋め込んだ Apple のルート証明書まで遡って検証する
  （`@apple/app-store-server-library` の `SignedDataVerifier`）。App Store Connect の APIキーは不要。
  本番とSandboxの両方を順に試すため、TestFlight でもそのまま動く。
- **Android**: Play が返す `originalJson` を、ライセンスキーで `SHA1withRSA` 署名検証する。
  Play Developer API のサービスアカウントは不要な代わりに、**払い戻し後の失効は検知できない**。
  払い戻しまで面倒を見るなら `purchases.products.get` への差し替えを検討する。

### テーブル

- `app_entitlements` — 検証済みレシート（`transaction_id` が主キー）と、それを使う端末の紐付け。
  機種変更・再インストール後の「購入を復元」では、同じレシートで `device_id` を貼り替える。
- `app_usage` — `subject`（`device:<id>` / `web:<id>` / `ip:<addr>`）ごとの日次カウント。
  日付は日本時間の暦日で区切る。古い行は溜まり続けるので、必要なら日次で掃除する。

### モデルの出し分けと原価の目安

買い切りユーザーだけ `claude-opus-5`（$5 / $25 per 1M tokens）、無料枠は `claude-sonnet-5`
（$2 / $10）で答える。人格・文体・字数は同じシステムプロンプトで揃えているので、差は回答の深さに出る。
システムプロンプト・回答・思考を合わせた1相談あたりの原価は、**Opus 5 で5〜10円、Sonnet 5 で3〜4円**。

安全分類器の拒否時に別モデルへ退避する `fallbacks` は Opus 5 のときだけ付ける。
`claude-sonnet-5` は `allowed_fallback_models` が空で退避先を持たないため、
無条件に付けると無料枠のリクエストが弾かれる。Sonnet 5 側の拒否は `stop_reason === 'refusal'` で受け止める。

`NUXT_PRO_DAILY_LIMIT` はこの単価に売値を掛け合わせて決めること
（例: 手取り420円の買い切りなら、1日30回を毎日使い切られると2週間で赤字になる）。
