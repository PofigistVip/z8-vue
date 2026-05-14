<script setup>
import NavEntry from './NavEntry.vue'

defineProps({
  entries: { type: Array, required: true },
  depth: { type: Number, default: 0 },
  activeKey: { type: String, default: '' },
})

const emit = defineEmits(['select'])

function entryKey(entry) {
  return `${entry.request}\u0000${entry.id ?? ''}`
}
</script>

<template>
  <ul class="list-none space-y-0.5 p-0" :class="depth > 0 ? 'mt-0.5 border-l border-slate-200 pl-2 ml-1' : ''">
    <li v-for="entry in entries" :key="entryKey(entry)">
      <button
        type="button"
        class="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-slate-50"
        :class="
          activeKey === entryKey(entry) ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
        "
        @click="emit('select', entry)"
      >
        <span>{{ entry.text }}</span>
      </button>
      <NavEntry
        v-if="entry.entries?.length"
        :entries="entry.entries"
        :depth="depth + 1"
        :active-key="activeKey"
        @select="emit('select', $event)"
      />
    </li>
  </ul>
</template>
