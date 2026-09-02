<script setup lang="ts">
const props = defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: { nickname: string; query: string; isPublic: boolean }]
}>()

const nickname = ref('')
const query = ref('')
const isPublic = ref(true)

function onSubmit() {
  if (props.disabled || !query.value.trim()) return
  emit('submit', {
    nickname: nickname.value.trim(),
    query: query.value.trim(),
    isPublic: isPublic.value,
  })
}
</script>

<template>
  <form class="paper space-y-5 p-6 sm:p-8" @submit.prevent="onSubmit">
    <div>
      <label for="nickname" class="mb-1 block text-sm text-sepia">ペンネーム</label>
      <input
        id="nickname"
        v-model="nickname"
        type="text"
        maxlength="30"
        placeholder="例：下人"
        class="w-full border-b border-sepia/50 bg-transparent px-1 py-2 outline-none focus:border-vermilion"
      >
    </div>

    <div>
      <label for="query" class="mb-1 block text-sm text-sepia">お悩み</label>
      <textarea
        id="query"
        v-model="query"
        rows="6"
        maxlength="2000"
        required
        placeholder="生きるべきか、辞めるべきか。君の悩みをここに記したまえ。"
        class="manuscript w-full border border-sepia/40 bg-paper/50 p-3 outline-none focus:border-vermilion"
      />
    </div>

    <label class="flex cursor-pointer items-center gap-2 text-sm">
      <input v-model="isPublic" type="checkbox" class="accent-vermilion">
      みんなの相談に公開する
    </label>

    <button
      type="submit"
      :disabled="disabled || !query.trim()"
      class="w-full bg-ink py-3 tracking-widest text-washi transition hover:bg-vermilion disabled:cursor-not-allowed disabled:opacity-40"
    >
      {{ disabled ? '芥川、思案中……' : '芥川に相談する' }}
    </button>
  </form>
</template>
