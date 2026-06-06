<script setup>
import { inject } from 'vue'

import Z8ResizeDivider from '../../components/z8/Z8ResizeDivider.vue'
import Z8View from '../../components/z8/Z8View.vue'
import ManagerFilePreviewForm from '../ManagerFilePreviewForm.vue'
import ManagerRecordRequisitesTooltip from '../ManagerRecordRequisitesTooltip.vue'
import { formatZ8UnixCellValue } from '../../z8/z8Format.js'
import { MANAGER_DOCUMENTS_VIEW_KEY } from './constants.js'

const {
  props,
  client,
  z8ViewRef,
  sections,
  sectionsLoading,
  sectionsError,
  selectedSectionKey,
  selectedSectionId,
  tooltipRow,
  tooltipAnchor,
  tooltipFormatField,
  sectionsWidth,
  applySectionsDelta,
  sectionKey,
  sectionLabel,
  sectionCount,
  listBeforeRequest,
  selectSection,
  showRowTooltip,
  scheduleHideRowTooltip,
  onTooltipHoverEnter,
  onTooltipHoverLeave,
} = inject(MANAGER_DOCUMENTS_VIEW_KEY)
</script>

<template>
  <div class="flex h-full min-h-0">
    <aside
      class="flex shrink-0 min-h-0 flex-col rounded-lg border border-slate-200 bg-white"
      :style="{ width: `${sectionsWidth}px` }"
    >
      <div class="shrink-0 border-b px-3 py-2">
        <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Разделы
        </div>
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
              @click="selectSection(row, index)"
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

    <Z8ResizeDivider @resize="applySectionsDelta" />

    <div class="flex min-h-0 min-w-0 flex-1 flex-col">
      <Z8View
        v-if="selectedSectionId"
        ref="z8ViewRef"
        :spec="props.spec"
        :view-request="props.viewRequest"
        :view-id="props.viewId"
        :before-request="listBeforeRequest"
      >
        <template #toolbar="{ hasSelection }">
          <button
            type="button"
            class="group inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors enabled:cursor-pointer enabled:border-emerald-300 enabled:bg-emerald-50 enabled:text-emerald-800 enabled:hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            :disabled="!hasSelection"
          >
            <svg
              class="h-4 w-4 shrink-0 text-emerald-600 group-disabled:text-slate-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                clip-rule="evenodd"
              />
            </svg>
            Согласовать
          </button>
          <button
            type="button"
            class="group inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors enabled:cursor-pointer enabled:border-red-300 enabled:bg-red-50 enabled:text-red-800 enabled:hover:bg-red-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            :disabled="!hasSelection"
          >
            <svg
              class="h-4 w-4 shrink-0 text-red-600 group-disabled:text-slate-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
              />
            </svg>
            Отклонить
          </button>
        </template>

        <template #mainListRow="{ row, selected, formatField }">
          <div
            class="w-full rounded-md border px-3 py-2 text-left"
            :class="
              selected ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'
            "
            @mouseenter="showRowTooltip(row, formatField, $event.currentTarget)"
            @mouseleave="scheduleHideRowTooltip"
          >
            <div class="flex items-baseline justify-between gap-2 text-xs">
              <span class="min-w-0 truncate font-semibold text-slate-900">
                {{ formatField('ОВУАвтора') }}
              </span>
              <span class="shrink-0 text-slate-500">{{ formatZ8UnixCellValue(row?.датаМне) }}</span>
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

        <template #form="{ record }">
          <ManagerFilePreviewForm
            :record="record"
            :client-session="String(client?._http?.session ?? '')"
          />
        </template>
      </Z8View>
      <div
        v-else-if="!sectionsLoading && !sectionsError"
        class="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-sm text-slate-600"
      >
        Выберите раздел.
      </div>
    </div>
  </div>

  <Teleport to="body">
    <ManagerRecordRequisitesTooltip
      :visible="Boolean(tooltipRow)"
      :anchor="tooltipAnchor"
      :row="tooltipRow"
      :format-field="tooltipFormatField ?? (() => '—')"
      @hover-enter="onTooltipHoverEnter"
      @hover-leave="onTooltipHoverLeave"
    />
  </Teleport>
</template>
