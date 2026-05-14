<script setup>
import { Teleport, ref } from 'vue'

import NavEntry from './NavEntry.vue'

const props = defineProps({
  entries: { type: Array, required: true },
  depth: { type: Number, default: 0 },
  activeKey: { type: String, default: '' },
})

const emit = defineEmits(['select'])

let rootHideTimer = null
const rootFlyout = ref(null)

let nestedHideTimer = null
const nestedFlyout = ref(null)

function entryKey(entry, index) {
  const req = typeof entry.request === 'string' ? entry.request.trim() : ''
  if (req) return `${entry.request}\u0000${entry.id ?? ''}`
  return `group:${props.depth}:${index}:${entry.text ?? ''}`
}

function isGroupNode(entry) {
  return (
    entry.isGroup === true ||
    (!String(entry.request ?? '').trim() && Array.isArray(entry.entries) && entry.entries.length > 0)
  )
}

function hasChildEntries(entry) {
  return Array.isArray(entry.entries) && entry.entries.length > 0
}

function cancelRootHide() {
  if (rootHideTimer != null) {
    clearTimeout(rootHideTimer)
    rootHideTimer = null
  }
}

function scheduleRootHide() {
  cancelRootHide()
  rootHideTimer = window.setTimeout(() => {
    rootFlyout.value = null
    rootHideTimer = null
  }, 200)
}

function openRootFlyout(evt, entry, key) {
  cancelRootHide()
  if (!hasChildEntries(entry)) return
  const el = evt.currentTarget
  const r = el.getBoundingClientRect()
  rootFlyout.value = {
    key,
    label: entry.text,
    entries: entry.entries,
    style: {
      top: `${Math.min(r.top, window.innerHeight - 120)}px`,
      left: `${r.right}px`,
      maxHeight: `min(70vh, calc(100vh - ${Math.min(r.top, window.innerHeight - 120)}px - 12px))`,
    },
  }
}

function onRootFlyoutEnter() {
  cancelRootHide()
}

function onRootSelect(entry) {
  emit('select', entry)
  scheduleRootHide()
}

function cancelNestedHide() {
  if (nestedHideTimer != null) {
    clearTimeout(nestedHideTimer)
    nestedHideTimer = null
  }
}

function scheduleNestedHide() {
  cancelNestedHide()
  nestedHideTimer = window.setTimeout(() => {
    nestedFlyout.value = null
    nestedHideTimer = null
  }, 200)
}

function openNestedFlyout(evt, entry, key) {
  cancelNestedHide()
  const el = evt.currentTarget
  const r = el.getBoundingClientRect()
  nestedFlyout.value = {
    key,
    entries: entry.entries,
    style: {
      top: `${Math.min(r.top, window.innerHeight - 120)}px`,
      left: `${r.right}px`,
      maxHeight: `min(70vh, calc(100vh - ${Math.min(r.top, window.innerHeight - 120)}px - 12px))`,
    },
  }
}

function onNestedFlyoutEnter() {
  cancelNestedHide()
}

function onNestedSelect(entry) {
  emit('select', entry)
  scheduleNestedHide()
}
</script>

<template>
  <!-- Корень: один список; подменю — только overlay (Teleport) -->
  <div v-if="depth === 0" class="flex min-h-0 min-w-0 flex-1 flex-col">
    <ul class="list-none flex-1 space-y-0.5 overflow-y-auto p-2">
      <li v-for="(entry, index) in entries" :key="entryKey(entry, index)">
        <template v-if="isGroupNode(entry)">
          <div
            class="flex cursor-default items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
            @mouseenter="openRootFlyout($event, entry, entryKey(entry, index))"
            @mouseleave="scheduleRootHide"
          >
            <span class="truncate">{{ entry.text }}</span>
            <span class="shrink-0 pl-1 text-slate-400" aria-hidden="true">›</span>
          </div>
        </template>
        <template v-else-if="hasChildEntries(entry)">
          <div
            @mouseenter="openRootFlyout($event, entry, entryKey(entry, index))"
            @mouseleave="scheduleRootHide"
          >
            <button
              type="button"
              class="flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-slate-50"
              :class="
                activeKey === entryKey(entry, index) ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
              "
              @click="emit('select', entry)"
            >
              <span class="truncate">{{ entry.text }}</span>
              <span class="shrink-0 pl-1 text-slate-400" aria-hidden="true">›</span>
            </button>
          </div>
        </template>
        <template v-else>
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-slate-50"
            :class="
              activeKey === entryKey(entry, index) ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
            "
            @mouseenter="scheduleRootHide"
            @click="emit('select', entry)"
          >
            <span class="truncate">{{ entry.text }}</span>
          </button>
        </template>
      </li>
    </ul>
  </div>

  <!-- Вложенные уровни: список + flyout (Teleport) -->
  <ul v-else class="list-none space-y-0.5 p-0">
    <li v-for="(entry, index) in entries" :key="entryKey(entry, index)">
      <template v-if="isGroupNode(entry)">
        <div
          class="relative"
          @mouseenter="openNestedFlyout($event, entry, entryKey(entry, index))"
          @mouseleave="scheduleNestedHide"
        >
          <div
            class="flex cursor-default items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <span class="truncate">{{ entry.text }}</span>
            <span class="shrink-0 pl-1 text-slate-400" aria-hidden="true">›</span>
          </div>
        </div>
      </template>
      <template v-else-if="hasChildEntries(entry)">
        <div
          class="relative"
          @mouseenter="openNestedFlyout($event, entry, entryKey(entry, index))"
          @mouseleave="scheduleNestedHide"
        >
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-slate-100"
            :class="
              activeKey === entryKey(entry, index) ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
            "
            @click="emit('select', entry)"
          >
            <span class="truncate">{{ entry.text }}</span>
            <span class="shrink-0 pl-1 text-slate-400" aria-hidden="true">›</span>
          </button>
        </div>
      </template>
      <template v-else>
        <button
          type="button"
          class="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-slate-100"
          :class="
            activeKey === entryKey(entry, index) ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
          "
          @click="emit('select', entry)"
        >
          <span class="truncate">{{ entry.text }}</span>
        </button>
      </template>
    </li>
  </ul>

  <Teleport to="body">
    <div
      v-if="depth === 0 && rootFlyout"
      class="fixed z-[9999] min-w-[12rem] overflow-y-auto rounded-md border border-slate-200 bg-white px-2 py-2 shadow-lg"
      :style="rootFlyout.style"
      @mouseenter="onRootFlyoutEnter"
      @mouseleave="scheduleRootHide"
    >
      <div class="mb-2 truncate text-xs font-semibold uppercase tracking-wide text-slate-500">
        {{ rootFlyout.label }}
      </div>
      <NavEntry
        :entries="rootFlyout.entries"
        :depth="1"
        :active-key="activeKey"
        @select="onRootSelect"
      />
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="depth > 0 && nestedFlyout && nestedFlyout.key"
      class="fixed z-[10000] min-w-[12rem] overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
      :style="nestedFlyout.style"
      @mouseenter="onNestedFlyoutEnter"
      @mouseleave="scheduleNestedHide"
    >
      <NavEntry
        :entries="nestedFlyout.entries"
        :depth="depth + 1"
        :active-key="activeKey"
        @select="onNestedSelect"
      />
    </div>
  </Teleport>
</template>
