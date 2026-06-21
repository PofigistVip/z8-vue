<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'

import { formatZ8DateTime } from '../z8/z8Format.js'
import Z8PdfPreview from '../components/z8/Z8PdfPreview.vue'
import Z8ResizeDivider from '../components/z8/Z8ResizeDivider.vue'
import { useResizableWidth } from '../components/z8/useResizableWidth.js'

const MIN_COLUMN_WIDTH = 200
const DIVIDER_WIDTH = 6

const props = defineProps({
  record: { type: Object, required: true },
  clientSession: { type: String, default: '' },
})

const LEFT_FILE_TYPES = new Set(['Доклад', 'Побудитель', 'Лист согласования', 'Особое мнение'])
const RIGHT_FILE_TYPES = new Set(['Проект документа', 'Приложение'])

const PREVIEWABLE_EXTENSIONS = new Set([
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'bmp',
  'webp',
  'tif',
  'tiff',
  'svg',
  'ico',
  'doc',
  'docx',
  'docm',
  'xls',
  'xlsx',
  'xlsm',
  'xlsb',
  'odt',
  'ott',
  'ods',
  'ots',
])

const openLeftId = ref('')
const openRightId = ref('')
const columnsRef = ref(null)

function getContainerWidth() {
  return columnsRef.value?.offsetWidth ?? 0
}

function getMaxLeftWidth() {
  const container = getContainerWidth()
  return Math.max(MIN_COLUMN_WIDTH, container - MIN_COLUMN_WIDTH - DIVIDER_WIDTH)
}

const {
  width: leftColumnWidth,
  applyDelta: applyLeftColumnDelta,
  setWidth: setLeftColumnWidth,
  isRestored: isLeftColumnRestored,
  applyStoredWidth: applyLeftColumnStoredWidth,
} = useResizableWidth(0, {
  min: MIN_COLUMN_WIDTH,
  max: () => getMaxLeftWidth(),
  storageKey: 'z8:panel-width:manager-file-columns',
  deferStorageRestore: true,
})

function initLeftColumnWidth() {
  if (isLeftColumnRestored.value) return
  const container = getContainerWidth()
  if (container > 0) {
    setLeftColumnWidth((container - DIVIDER_WIDTH) / 2)
  }
}

function normalizeFilesValue(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw !== 'string' || !raw.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const files = computed(() => normalizeFilesValue(props.record?.['актуальнаяВерсия.файлы']))

function getFileExtension(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  const dot = normalized.lastIndexOf('.')
  if (dot < 0 || dot === normalized.length - 1) return ''
  return normalized.slice(dot + 1)
}

function isPreviewableFile(file) {
  const nameExt = getFileExtension(file?.name)
  const pathExt = getFileExtension(file?.path)
  return (
    PREVIEWABLE_EXTENSIONS.has(nameExt) ||
    PREVIEWABLE_EXTENSIONS.has(pathExt)
  )
}

function fileType(file) {
  const t = file?.details?.fileType
  return typeof t === 'string' ? t.trim() : ''
}

const leftFiles = computed(() =>
  files.value.filter((f) => LEFT_FILE_TYPES.has(fileType(f)) && isPreviewableFile(f))
)
const rightFiles = computed(() =>
  files.value.filter((f) => RIGHT_FILE_TYPES.has(fileType(f)) && isPreviewableFile(f))
)

function fileKey(file, idx) {
  const id = file?.id
  if (typeof id === 'string' && id.trim()) return id.trim()
  return String(idx)
}

function splitFilesAroundOpen(fileList, openId) {
  const openIndex = fileList.findIndex((f, i) => fileKey(f, i) === openId)
  if (openIndex < 0) {
    return {
      before: fileList.map((file, idx) => ({ file, idx })),
      open: null,
      after: [],
    }
  }
  return {
    before: fileList.slice(0, openIndex).map((file, i) => ({ file, idx: i })),
    open: { file: fileList[openIndex], idx: openIndex },
    after: fileList.slice(openIndex + 1).map((file, i) => ({ file, idx: openIndex + 1 + i })),
  }
}

const leftFileSections = computed(() =>
  splitFilesAroundOpen(leftFiles.value, openLeftId.value)
)
const rightFileSections = computed(() =>
  splitFilesAroundOpen(rightFiles.value, openRightId.value)
)

function resetOpenDefaults() {
  const left = leftFiles.value
  const right = rightFiles.value
  openLeftId.value = left.length ? fileKey(left[0], 0) : ''
  openRightId.value = right.length ? fileKey(right[0], 0) : ''
}

watch(
  () => props.record?.recordId,
  () => {
    resetOpenDefaults()
  },
  { immediate: true }
)

onMounted(() => {
  void nextTick(() => {
    if (!applyLeftColumnStoredWidth()) {
      initLeftColumnWidth()
    }
  })
})

function fileTitle(file) {
  const parts = [
    file?.details?.fileType,
    file?.details?.authorAgent,
    file?.name,
  ]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)

  return parts.length ? parts.join(' - ') : 'Файл'
}

function fileMetaRight(file) {
  const time = file?.time
  const label = formatZ8DateTime(time)
  return label || ''
}

function filePreviewUrl(file) {
  const path = typeof file?.path === 'string' ? file.path : ''
  const id = typeof file?.id === 'string' ? file.id : ''
  const session = typeof props.clientSession === 'string' ? props.clientSession : ''
  if (!path || !id || !session) return ''

  const pathEnc = encodeURIComponent(path)
  const idEnc = encodeURIComponent(id)
  const sessionEnc = encodeURIComponent(session)
  return `${window.location.origin}/${pathEnc}?id=${idEnc}&session=${sessionEnc}&preview=true`
}

function fileDownloadName(file) {
  return typeof file?.name === 'string' && file.name.trim() ? file.name.trim() : 'document.pdf'
}

function toggleFilePanel(key, fileList, openIdRef) {
  if (openIdRef.value !== key) {
    openIdRef.value = key
    return
  }

  if (fileList.length <= 1) return

  const currentIndex = fileList.findIndex((file, idx) => fileKey(file, idx) === key)
  if (currentIndex < 0) {
    openIdRef.value = key
    return
  }

  const nextIndex = (currentIndex + 1) % fileList.length
  openIdRef.value = fileKey(fileList[nextIndex], nextIndex)
}

function toggleLeft(key) {
  toggleFilePanel(key, leftFiles.value, openLeftId)
}

function toggleRight(key) {
  toggleFilePanel(key, rightFiles.value, openRightId)
}
</script>

<template>
  <div ref="columnsRef" class="flex h-full min-h-0">
    <section
      class="flex shrink-0 min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white"
      :style="{ width: `${leftColumnWidth}px` }"
    >
      <div class="shrink-0 border-b px-4 py-3">
        <div class="text-sm font-semibold text-slate-800">Файлы</div>
      </div>

      <div v-if="!leftFiles.length" class="p-3 text-sm text-slate-600">
        Нет файлов для предпросмотра.
      </div>
      <div v-else class="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
        <div v-if="leftFileSections.before.length" class="shrink-0 space-y-2">
          <button
            v-for="{ file: f, idx } in leftFileSections.before"
            :key="fileKey(f, idx)"
            type="button"
            class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100"
            @click="toggleLeft(fileKey(f, idx))"
          >
            <span class="min-w-0 flex-1 truncate font-medium text-slate-800">{{ fileTitle(f) }}</span>
            <span class="shrink-0 text-xs text-slate-500">{{ fileMetaRight(f) }}</span>
          </button>
        </div>

        <div
          v-if="leftFileSections.open"
          class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-slate-200 bg-slate-50"
        >
          <button
            type="button"
            class="flex w-full shrink-0 cursor-pointer items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-3 py-2 text-left text-sm"
            @click="toggleLeft(fileKey(leftFileSections.open.file, leftFileSections.open.idx))"
          >
            <span class="min-w-0 flex-1 truncate font-medium text-slate-800">
              {{ fileTitle(leftFileSections.open.file) }}
            </span>
            <span class="shrink-0 text-xs text-slate-500">
              {{ fileMetaRight(leftFileSections.open.file) }}
            </span>
          </button>
          <div class="flex min-h-0 flex-1 flex-col overflow-hidden bg-white p-2">
            <Z8PdfPreview
              v-if="filePreviewUrl(leftFileSections.open.file)"
              class="min-h-0 flex-1"
              :src="filePreviewUrl(leftFileSections.open.file)"
              :filename="fileDownloadName(leftFileSections.open.file)"
            />
            <div v-else class="text-xs text-slate-600">
              Нет ссылки для предпросмотра.
            </div>
          </div>
        </div>

        <div v-if="leftFileSections.after.length" class="shrink-0 space-y-2">
          <button
            v-for="{ file: f, idx } in leftFileSections.after"
            :key="fileKey(f, idx)"
            type="button"
            class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100"
            @click="toggleLeft(fileKey(f, idx))"
          >
            <span class="min-w-0 flex-1 truncate font-medium text-slate-800">{{ fileTitle(f) }}</span>
            <span class="shrink-0 text-xs text-slate-500">{{ fileMetaRight(f) }}</span>
          </button>
        </div>
      </div>
    </section>

    <Z8ResizeDivider @resize="applyLeftColumnDelta" />

    <section class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div class="shrink-0 border-b px-4 py-3">
        <div class="text-sm font-semibold text-slate-800">Файлы</div>
      </div>

      <div v-if="!rightFiles.length" class="p-3 text-sm text-slate-600">
        Нет файлов для предпросмотра.
      </div>
      <div v-else class="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
        <div v-if="rightFileSections.before.length" class="shrink-0 space-y-2">
          <button
            v-for="{ file: f, idx } in rightFileSections.before"
            :key="fileKey(f, idx)"
            type="button"
            class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100"
            @click="toggleRight(fileKey(f, idx))"
          >
            <span class="min-w-0 flex-1 truncate font-medium text-slate-800">{{ fileTitle(f) }}</span>
            <span class="shrink-0 text-xs text-slate-500">{{ fileMetaRight(f) }}</span>
          </button>
        </div>

        <div
          v-if="rightFileSections.open"
          class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-slate-200 bg-slate-50"
        >
          <button
            type="button"
            class="flex w-full shrink-0 cursor-pointer items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-3 py-2 text-left text-sm"
            @click="toggleRight(fileKey(rightFileSections.open.file, rightFileSections.open.idx))"
          >
            <span class="min-w-0 flex-1 truncate font-medium text-slate-800">
              {{ fileTitle(rightFileSections.open.file) }}
            </span>
            <span class="shrink-0 text-xs text-slate-500">
              {{ fileMetaRight(rightFileSections.open.file) }}
            </span>
          </button>
          <div class="flex min-h-0 flex-1 flex-col overflow-hidden bg-white p-2">
            <Z8PdfPreview
              v-if="filePreviewUrl(rightFileSections.open.file)"
              class="min-h-0 flex-1"
              :src="filePreviewUrl(rightFileSections.open.file)"
              :filename="fileDownloadName(rightFileSections.open.file)"
            />
            <div v-else class="text-xs text-slate-600">
              Нет ссылки для предпросмотра.
            </div>
          </div>
        </div>

        <div v-if="rightFileSections.after.length" class="shrink-0 space-y-2">
          <button
            v-for="{ file: f, idx } in rightFileSections.after"
            :key="fileKey(f, idx)"
            type="button"
            class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100"
            @click="toggleRight(fileKey(f, idx))"
          >
            <span class="min-w-0 flex-1 truncate font-medium text-slate-800">{{ fileTitle(f) }}</span>
            <span class="shrink-0 text-xs text-slate-500">{{ fileMetaRight(f) }}</span>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
