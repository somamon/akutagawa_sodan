<template>
  <div class="min-h-screen bg-washi font-mincho text-ink">
    <header class="border-b border-sepia/30 py-6 text-center">
      <NuxtLink to="/" class="inline-block">
        <h1 class="text-2xl font-bold tracking-widest sm:text-3xl">AI芥川龍之介の人生相談</h1>
        <p class="mt-2 text-sm text-sepia">— 君の悩み、僕が冷徹に解剖しよう —</p>
      </NuxtLink>
    </header>

    <main class="mx-auto max-w-2xl px-4 py-8">
      <NuxtPage />
    </main>

    <footer class="border-t border-sepia/30 py-6 text-center text-xs text-sepia">
      本サイトの回答はAIによる創作であり、実在した芥川龍之介の見解ではありません。
    </footer>
  </div>
</template>
