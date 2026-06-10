<script setup>
import { computed, inject, onUnmounted, watch } from 'vue'

import ManagerRecordRequisitesTooltip from '../ManagerRecordRequisitesTooltip.vue'
import Z8List from '../../components/z8/Z8List.vue'
import { formatZ8UnixCellValue } from '../../z8/z8Format.js'
import { MANAGER_DOCUMENTS_VIEW_KEY } from './constants.js'

const view = inject(MANAGER_DOCUMENTS_VIEW_KEY)

function bindRecordsListRef(el) {
  view.recordsListRef.value = el
}

const {
  selectedSectionId,
  recordsListRef,
  listboxControl,
  listboxRecord,
  onListSelectRow,
  onListServerResponse,
  reloadRecordsList,
  tooltipRow,
  tooltipAnchor,
  tooltipFormatField,
  toggleRowTooltip,
  hideRowTooltip,
} = view

const listRangeLabel = computed(() => {
  const list = recordsListRef.value
  if (!list) return '0'
  return list.rangeLabel ?? '0'
})

const listLoading = computed(() => Boolean(recordsListRef.value?.effectiveLoading))

function onRequisitesClick(row, formatField, event) {
  toggleRowTooltip(row, formatField, event.currentTarget)
}

function onSelectRow(payload) {
  hideRowTooltip()
  onListSelectRow(payload)
}

function onDocumentPointerDown(event) {
  const target = event.target
  if (!(target instanceof Element)) return
  if (target.closest('[role="tooltip"]')) return
  if (target.closest('[data-requisites-trigger]')) return
  hideRowTooltip()
}

watch(tooltipRow, (row) => {
  if (row) {
    document.addEventListener('pointerdown', onDocumentPointerDown, true)
  } else {
    document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  }
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
})
</script>

<template>
  <div
    class="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white"
  >
    <div class="shrink-0 border-b border-slate-200 px-3 py-2">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-semibold text-slate-900">Записи</h2>
        <div class="flex items-center gap-2">
          <span class="text-[11px] tabular-nums text-slate-600">{{ listRangeLabel }}</span>
          <button
            type="button"
            class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            :disabled="listLoading || !selectedSectionId"
            aria-label="Обновить"
            @click="reloadRecordsList"
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fill-rule="evenodd"
                d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden p-2">
      <div
        v-if="!selectedSectionId"
        class="flex h-full items-center justify-center px-2 text-sm text-slate-600"
      >
        Выберите раздел.
      </div>

      <Z8List
        v-else
        :ref="bindRecordsListRef"
        :control="listboxControl"
        :record="listboxRecord"
        @select-row="onSelectRow"
        @server-response="onListServerResponse"
      >
        <template #row="{ row, selected, formatField }">
          <div
            class="w-full rounded-md border px-3 py-2 text-left"
            :class="
              selected
                ? 'border border-slate-200 border-l-4 border-l-sky-500 bg-sky-50'
                : 'border-slate-200 bg-white'
            "
          >
            <div class="flex items-baseline justify-between gap-2 text-xs">
              <span class="min-w-0 truncate font-semibold text-slate-900">
                {{ formatField('ОВУАвтора') }}
              </span>
              <div class="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  data-requisites-trigger
                  class="inline-flex h-6 w-6 items-center justify-center rounded-md text-sky-600 hover:bg-slate-100"
                  aria-label="Реквизиты"
                  @click.stop="onRequisitesClick(row, formatField, $event)"
                >
                  <svg
                    class="h-4 w-4 shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM9 9a1 1 0 0 1 2 0v.01a1 1 0 1 1-2 0V9Zm1 4a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H10Z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </button>
                <span class="text-slate-500">{{ formatZ8UnixCellValue(row?.датаМне) }}</span>
              </div>
            </div>
            <div class="mt-1 truncate text-sm text-slate-800">
              {{ formatField('заголовок') }}
            </div>
            <div class="mt-1 flex items-baseline justify-between gap-2 text-xs text-slate-600">
              <span class="min-w-0 truncate">{{ formatField('регНомер') }}</span>
              <span class="shrink-0">{{ formatField('срочность') }}</span>
            </div>
          </div>
        </template>
      </Z8List>
    </div>
  </div>

  <Teleport to="body">
    <ManagerRecordRequisitesTooltip
      :visible="Boolean(tooltipRow)"
      :anchor="tooltipAnchor"
      :row="tooltipRow"
      :format-field="tooltipFormatField ?? (() => '—')"
    />
  </Teleport>
</template>
