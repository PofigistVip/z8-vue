<script setup>
import { inject } from 'vue'

import Z8ResizeDivider from '../../components/z8/Z8ResizeDivider.vue'
import Z8View from '../../components/z8/Z8View.vue'
import ManagerFilePreviewForm from '../ManagerFilePreviewForm.vue'
import ManagerRecordRequisitesTooltip from '../ManagerRecordRequisitesTooltip.vue'
import { formatZ8UnixCellValue } from '../../z8/z8Format.js'
import { MANAGER_DOCUMENTS_VIEW_KEY } from './constants.js'
import ManagerDocumentsRecordOperations from './ManagerDocumentsRecordOperations.vue'

const view = inject(MANAGER_DOCUMENTS_VIEW_KEY)

function bindZ8ViewRef(el) {
  view.z8ViewRef.value = el
}

const {
  props,
  client,
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
  recordOperationsFor,
  openRecordOperation,
  operationSubmitting,
} = view
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
        :ref="bindZ8ViewRef"
        :spec="props.spec"
        :view-request="props.viewRequest"
        :view-id="props.viewId"
        :before-request="listBeforeRequest"
      >
        <template #toolbar="{ record, hasSelection }">
          <ManagerDocumentsRecordOperations
            :operations="recordOperationsFor(record)"
            :disabled="!hasSelection"
            :submitting="operationSubmitting"
            @run="(op) => openRecordOperation(record, op)"
          />
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
