<script setup>
import { computed, watch } from 'vue'

import {
  dismissMessage,
  scheduleDismiss,
  useZ8Messages,
} from '../stores/z8MessageStore.js'

const props = defineProps({
  autoHideMs: { type: Number, default: 10_000 },
})

const messages = useZ8Messages()
const items = computed(() => messages.items)

const scheduledIds = new Set()

watch(
  () => items.value.map((m) => m.id),
  (ids) => {
    for (const id of ids) {
      if (scheduledIds.has(id)) continue
      scheduledIds.add(id)
      scheduleDismiss(id, props.autoHideMs)
    }
    for (const id of [...scheduledIds]) {
      if (!ids.includes(id)) scheduledIds.delete(id)
    }
  },
  { immediate: true }
)

function onDismiss(id) {
  scheduledIds.delete(id)
  dismissMessage(id)
}

function formatTime(raw) {
  if (!raw) return ''
  const ts = Date.parse(raw)
  if (Number.isNaN(ts)) return raw
  return new Date(ts).toLocaleString()
}

function typeClasses(type) {
  switch (type) {
    case 'error':
      return 'border-red-200 bg-red-50 text-red-900'
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-900'
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900'
    default:
      return 'border-slate-200 bg-white text-slate-900'
  }
}
</script>

<template>
  <div
    v-if="items.length"
    class="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col-reverse gap-2"
    role="region"
    aria-live="polite"
    aria-label="Сообщения"
  >
    <div
      v-for="msg in items"
      :key="msg.id"
      class="pointer-events-auto rounded-lg border p-3 shadow-lg"
      :class="typeClasses(msg.type)"
    >
      <div class="flex items-start gap-2">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium leading-snug">{{ msg.text }}</p>
          <p
            v-if="msg.source || msg.time"
            class="mt-1 text-xs opacity-80"
          >
            <span v-if="msg.source">{{ msg.source }}</span>
            <span v-if="msg.source && msg.time"> · </span>
            <span v-if="msg.time">{{ formatTime(msg.time) }}</span>
          </p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded p-0.5 text-lg leading-none opacity-60 hover:opacity-100"
          aria-label="Закрыть"
          @click="onDismiss(msg.id)"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>
