<script setup>
import { inject, ref } from 'vue'

import { MANAGER_DOCUMENTS_VIEW_KEY } from './constants.js'

const {
  sections,
  sectionsLoading,
  sectionsError,
  selectedSectionKey,
  sectionKey,
  sectionLabel,
  sectionCount,
  selectSection,
} = inject(MANAGER_DOCUMENTS_VIEW_KEY)

const sectionsSheetOpen = ref(false)

function onSectionChange(event) {
  const key = event.target.value
  const index = sections.value.findIndex((row, i) => sectionKey(row, i) === key)
  if (index >= 0) {
    selectSection(sections.value[index], index)
  }
}

function onSelectSectionFromSheet(row, index) {
  selectSection(row, index)
  sectionsSheetOpen.value = false
}
</script>

<template>
  <header
    class="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 py-2"
  >
    <button
      type="button"
      class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
      aria-label="Разделы"
      @click="sectionsSheetOpen = true"
    >
      <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fill-rule="evenodd"
          d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
          clip-rule="evenodd"
        />
      </svg>
    </button>

    <label class="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-700">
      <span class="shrink-0 font-medium">Раздел:</span>
      <select
        class="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
        :value="selectedSectionKey"
        :disabled="sectionsLoading || !sections.length"
        @change="onSectionChange"
      >
        <option v-if="!sections.length" value="">—</option>
        <option
          v-for="(row, index) in sections"
          :key="sectionKey(row, index)"
          :value="sectionKey(row, index)"
        >
          {{ sectionLabel(row) }}
          <template v-if="sectionCount(row) !== ''"> ({{ sectionCount(row) }})</template>
        </option>
      </select>
    </label>
  </header>

  <Teleport to="body">
    <div
      v-if="sectionsSheetOpen"
      class="fixed inset-0 z-50"
    >
      <div
        class="absolute inset-0 bg-black/30"
        @click="sectionsSheetOpen = false"
      />
      <aside
        class="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-xl"
      >
        <div class="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
          <div class="text-sm font-semibold text-slate-900">Разделы</div>
          <button
            type="button"
            class="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Закрыть"
            @click="sectionsSheetOpen = false"
          >
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
              />
            </svg>
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-2">
          <div
            v-if="sectionsLoading"
            class="px-2 py-3 text-sm text-slate-600"
          >
            Загрузка…
          </div>

          <div
            v-else-if="sectionsError"
            class="rounded-md border border-red-200 bg-red-50 px-2 py-2 text-sm text-red-800"
          >
            {{ sectionsError }}
          </div>

          <div
            v-else-if="!sections.length"
            class="px-2 py-3 text-sm text-slate-600"
          >
            Нет разделов.
          </div>

          <ul v-else class="list-none space-y-0.5">
            <li v-for="(row, index) in sections" :key="sectionKey(row, index)">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-slate-50"
                :class="
                  selectedSectionKey === sectionKey(row, index)
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-700'
                "
                @click="onSelectSectionFromSheet(row, index)"
              >
                <span class="min-w-0 truncate">{{ sectionLabel(row) }}</span>
                <span
                  v-if="sectionCount(row) !== ''"
                  class="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-xs tabular-nums text-slate-700"
                >
                  {{ sectionCount(row) }}
                </span>
              </button>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  </Teleport>
</template>
