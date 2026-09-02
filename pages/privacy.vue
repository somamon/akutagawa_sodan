<script setup lang="ts">
useHead({ title: 'プライバシーポリシー・免責事項 | AI芥川龍之介の人生相談' })
</script>

<template>
  <div class="paper space-y-6 p-6 sm:p-8">
    <h2 class="border-b border-sepia/30 pb-2 text-xl tracking-widest">プライバシーポリシー・免責事項</h2>

    <section class="space-y-2">
      <h3 class="font-bold">1. 収集する情報</h3>
      <p class="text-sm leading-relaxed">
        当サイトは、相談フォームに入力されたペンネーム・相談内容・公開設定、および生成された回答を保存します。
        氏名・住所等の個人情報の入力は求めていません。相談内容に個人を特定できる情報を書かないようご注意ください。
      </p>
    </section>

    <section class="space-y-2">
      <h3 class="font-bold">2. AIによる回答生成</h3>
      <p class="text-sm leading-relaxed">
        回答の生成のため、相談内容はAnthropic社のAPIに送信されます。
        当サイトの回答はAIによる創作であり、実在した芥川龍之介の見解ではありません。
        また、医療・法律・投資等の専門的助言ではありません。深刻な悩みは専門家や公的相談窓口にご相談ください。
      </p>
    </section>

    <section class="space-y-2">
      <h3 class="font-bold">3. データの保存と公開</h3>
      <p class="text-sm leading-relaxed">
        投稿はデータベース（Supabase）に保存されます。「みんなの相談に公開する」を選択した投稿は当サイト上で公開されます。
        非公開の投稿もURLを知る人は閲覧できます。投稿の削除を希望する場合は、下記の連絡先までご連絡ください。
      </p>
    </section>

    <section class="space-y-2">
      <h3 class="font-bold">4. Cookie・広告について</h3>
      <p class="text-sm leading-relaxed">
        当サイトは、第三者配信の広告サービス（Google AdSense）を利用する場合があります。
        広告配信事業者は、ユーザーの興味に応じた広告を表示するためにCookieを使用することがあります。
        パーソナライズ広告は
        <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" class="underline">Googleの広告設定</a>
        で無効にできます。
        また、当サイトはAmazonアソシエイト・プログラムに参加する場合があり、その際は適格販売により収入を得ます。
      </p>
    </section>

    <section class="space-y-2">
      <h3 class="font-bold">5. アクセス解析</h3>
      <p class="text-sm leading-relaxed">
        サーバーの運用・不正利用の防止のため、IPアドレス等のアクセスログを一時的に記録することがあります。
      </p>
    </section>

    <section class="space-y-2">
      <h3 class="font-bold">6. 免責</h3>
      <p class="text-sm leading-relaxed">
        当サイトの利用により生じたいかなる損害についても、運営者は責任を負いません。
        本ポリシーは予告なく改定されることがあります。
      </p>
    </section>

    <p class="text-right text-xs text-sepia">制定日: 2026年9月3日</p>

    <NuxtLink to="/" class="inline-block text-sm text-sepia underline underline-offset-4 hover:text-vermilion">
      トップへ戻る
    </NuxtLink>
  </div>
</template>
