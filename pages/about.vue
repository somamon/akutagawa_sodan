<script setup lang="ts">
useHead({ title: '運営者情報 | AI芥川龍之介の人生相談' })
</script>

<template>
  <div class="paper space-y-6 p-6 sm:p-8">
    <h2 class="border-b border-sepia/30 pb-2 text-xl tracking-widest">このサイトについて</h2>

    <section class="space-y-2">
      <p class="text-sm leading-relaxed">
        「AI芥川龍之介の人生相談」は、文豪・芥川龍之介の作品と思想をAIに学ばせ、
        現代人の悩みに大正の文人らしい皮肉と諦念で答えてもらう娯楽サイトです。
        回答の生成には、青空文庫で公開されている芥川龍之介の全作品（374作品）を参照した
        ペルソナ設定を用いています。
      </p>
      <p class="text-sm leading-relaxed">
        回答はすべてAIによる創作です。お守り程度に受け取って、深刻な悩みは人間に相談してください。
        ——芥川もきっとそう言うはずです。
      </p>
    </section>

    <section class="space-y-2">
      <h3 class="font-bold">運営者</h3>
      <p class="text-sm">somamon</p>
    </section>

    <section class="space-y-2">
      <h3 class="font-bold">連絡先</h3>
      <p class="text-sm leading-relaxed">
        投稿の削除依頼・不具合報告・その他のお問い合わせ:
        <a href="mailto:kaiseimondo@gmail.com" class="underline">kaiseimondo@gmail.com</a>
      </p>
    </section>

    <section class="space-y-2">
      <h3 class="font-bold">出典</h3>
      <p class="text-sm leading-relaxed">
        芥川作品のテキストは<a href="https://www.aozora.gr.jp/" target="_blank" rel="noopener noreferrer" class="underline">青空文庫</a>を利用しています。
      </p>
    </section>

    <NuxtLink to="/" class="inline-block text-sm text-sepia underline underline-offset-4 hover:text-vermilion">
      トップへ戻る
    </NuxtLink>
  </div>
</template>
