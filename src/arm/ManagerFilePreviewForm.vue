<script setup>
import { computed, ref, watch } from 'vue'

import { formatZ8DateTime } from '../z8/z8Format.js'
import Z8PdfPreview from '../components/z8/Z8PdfPreview.vue'

const props = defineProps({
  record: { type: Object, required: true },
  clientSession: { type: String, default: '' },
})

const LEFT_FILE_TYPES = new Set(['Доклад', 'Побудитель', 'Лист согласования'])
const RIGHT_FILE_TYPES = new Set(['Проект документа', 'Приложение'])

const openLeftId = ref('')
const openRightId = ref('')

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

function isPdfFile(file) {
  const name = typeof file?.name === 'string' ? file.name : ''
  const path = typeof file?.path === 'string' ? file.path : ''
  return (
    name.trim().toLowerCase().endsWith('.pdf') ||
    path.trim().toLowerCase().endsWith('.pdf')
  )
}

function fileType(file) {
  const t = file?.details?.fileType
  return typeof t === 'string' ? t.trim() : ''
}

const leftFiles = computed(() =>
  files.value.filter((f) => LEFT_FILE_TYPES.has(fileType(f)) && isPdfFile(f))
)
const rightFiles = computed(() =>
  files.value.filter((f) => RIGHT_FILE_TYPES.has(fileType(f)) && isPdfFile(f))
)

function fileKey(file, idx) {
  const id = file?.id
  if (typeof id === 'string' && id.trim()) return id.trim()
  return String(idx)
}

function findOpenFile(fileList, openId) {
  if (!openId) return null
  const idx = fileList.findIndex((f, i) => fileKey(f, i) === openId)
  return idx >= 0 ? fileList[idx] : null
}

const openLeftFile = computed(() => findOpenFile(leftFiles.value, openLeftId.value))
const openRightFile = computed(() => findOpenFile(rightFiles.value, openRightId.value))

function resetOpenDefaults() {
  const left = leftFiles.value
  const right = rightFiles.value
  openLeftId.value = left.length ? fileKey(left[0], 0) : ''
  openRightId.value = right.length ? fileKey(right[0], 0) : ''
}

watch(
  () => props.record?.recordId,
  () => resetOpenDefaults(),
  { immediate: true }
)

function fileTitle(file) {
  const t = file?.details?.fileType
  if (typeof t === 'string' && t.trim()) return t.trim()
  const n = file?.name
  if (typeof n === 'string' && n.trim()) return n.trim()
  return 'Файл'
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

function toggleLeft(key) {
  openLeftId.value = openLeftId.value === key ? '' : key
}

function toggleRight(key) {
  openRightId.value = openRightId.value === key ? '' : key
}
</script>

<template>
  <div class="grid h-full min-h-0 grid-cols-2 gap-4">
    <section class="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div class="shrink-0 border-b px-4 py-3">
        <div class="text-sm font-semibold text-slate-800">Файлы</div>
      </div>

      <div v-if="!leftFiles.length" class="p-3 text-sm text-slate-600">
        Нет файлов для предпросмотра.
      </div>
      <template v-else>
        <div class="shrink-0 space-y-2 p-3 pb-0">
          <button
            v-for="(f, idx) in leftFiles"
            :key="fileKey(f, idx)"
            type="button"
            class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors"
            :class="
              openLeftId === fileKey(f, idx)
                ? 'border-slate-400 bg-slate-100'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
            "
            @click="toggleLeft(fileKey(f, idx))"
          >
            <span class="min-w-0 truncate font-medium text-slate-800">{{ fileTitle(f) }}</span>
            <span class="shrink-0 text-xs text-slate-500">{{ fileMetaRight(f) }}</span>
          </button>
        </div>

        <div
          v-if="openLeftFile"
          class="flex min-h-0 flex-1 flex-col overflow-hidden p-3 pt-2"
        >
          <a
            v-if="filePreviewUrl(openLeftFile)"
            class="mb-2 inline-block shrink-0 text-xs text-slate-500 underline hover:text-slate-800"
            :href="filePreviewUrl(openLeftFile)"
            target="_blank"
            rel="noreferrer"
          >
            Открыть
          </a>
          <Z8PdfPreview
            v-if="filePreviewUrl(openLeftFile)"
            class="min-h-0 flex-1"
            :src="filePreviewUrl(openLeftFile)"
            :filename="fileDownloadName(openLeftFile)"
          />
          <div v-else class="text-xs text-slate-600">
            Нет ссылки для предпросмотра.
          </div>
        </div>
      </template>
    </section>

    <section class="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div class="shrink-0 border-b px-4 py-3">
        <div class="text-sm font-semibold text-slate-800">Файлы</div>
      </div>

      <div v-if="!rightFiles.length" class="p-3 text-sm text-slate-600">
        Нет файлов для предпросмотра.
      </div>
      <template v-else>
        <div class="shrink-0 space-y-2 p-3 pb-0">
          <button
            v-for="(f, idx) in rightFiles"
            :key="fileKey(f, idx)"
            type="button"
            class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors"
            :class="
              openRightId === fileKey(f, idx)
                ? 'border-slate-400 bg-slate-100'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
            "
            @click="toggleRight(fileKey(f, idx))"
          >
            <span class="min-w-0 truncate font-medium text-slate-800">{{ fileTitle(f) }}</span>
            <span class="shrink-0 text-xs text-slate-500">{{ fileMetaRight(f) }}</span>
          </button>
        </div>

        <div
          v-if="openRightFile"
          class="flex min-h-0 flex-1 flex-col overflow-hidden p-3 pt-2"
        >
          <a
            v-if="filePreviewUrl(openRightFile)"
            class="mb-2 inline-block shrink-0 text-xs text-slate-500 underline hover:text-slate-800"
            :href="filePreviewUrl(openRightFile)"
            target="_blank"
            rel="noreferrer"
          >
            Открыть
          </a>
          <Z8PdfPreview
            v-if="filePreviewUrl(openRightFile)"
            class="min-h-0 flex-1"
            :src="filePreviewUrl(openRightFile)"
            :filename="fileDownloadName(openRightFile)"
          />
          <div v-else class="text-xs text-slate-600">
            Нет ссылки для предпросмотра.
          </div>
        </div>
      </template>
    </section>
  </div>
</template>
