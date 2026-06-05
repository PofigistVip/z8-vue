<script setup>
import { computed, ref, watch } from 'vue'

import { formatZ8DateTime } from '../z8/z8Format.js'

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

function fileType(file) {
  const t = file?.details?.fileType
  return typeof t === 'string' ? t.trim() : ''
}

const leftFiles = computed(() => files.value.filter((f) => LEFT_FILE_TYPES.has(fileType(f))))
const rightFiles = computed(() => files.value.filter((f) => RIGHT_FILE_TYPES.has(fileType(f))))

function fileKey(file, idx) {
  const id = file?.id
  if (typeof id === 'string' && id.trim()) return id.trim()
  return String(idx)
}

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
      <div class="min-h-0 flex-1 overflow-y-auto p-3">
        <div v-if="!leftFiles.length" class="text-sm text-slate-600">
          Нет файлов для предпросмотра.
        </div>
        <div v-else class="space-y-2">
          <details
            v-for="(f, idx) in leftFiles"
            :key="fileKey(f, idx)"
            class="rounded-md border border-slate-200 bg-slate-50"
            :open="openLeftId === fileKey(f, idx)"
          >
            <summary
              class="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm"
              @click.prevent="toggleLeft(fileKey(f, idx))"
            >
              <span class="min-w-0 truncate font-medium text-slate-800">{{ fileTitle(f) }}</span>
              <span class="shrink-0 text-xs text-slate-500">{{ fileMetaRight(f) }}</span>
            </summary>
            <div class="border-t border-slate-200 bg-white p-2">
              <a
                v-if="filePreviewUrl(f)"
                class="mb-2 inline-block text-xs text-slate-500 underline hover:text-slate-800"
                :href="filePreviewUrl(f)"
                target="_blank"
                rel="noreferrer"
              >
                Открыть
              </a>
              <iframe
                v-if="filePreviewUrl(f)"
                :src="filePreviewUrl(f)"
                class="h-[520px] w-full rounded-md border border-slate-200"
              />
              <div v-else class="text-xs text-slate-600">
                Нет ссылки для предпросмотра.
              </div>
            </div>
          </details>
        </div>
      </div>
    </section>

    <section class="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div class="shrink-0 border-b px-4 py-3">
        <div class="text-sm font-semibold text-slate-800">Файлы</div>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto p-3">
        <div v-if="!rightFiles.length" class="text-sm text-slate-600">
          Нет файлов для предпросмотра.
        </div>
        <div v-else class="space-y-2">
          <details
            v-for="(f, idx) in rightFiles"
            :key="fileKey(f, idx)"
            class="rounded-md border border-slate-200 bg-slate-50"
            :open="openRightId === fileKey(f, idx)"
          >
            <summary
              class="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm"
              @click.prevent="toggleRight(fileKey(f, idx))"
            >
              <span class="min-w-0 truncate font-medium text-slate-800">{{ fileTitle(f) }}</span>
              <span class="shrink-0 text-xs text-slate-500">{{ fileMetaRight(f) }}</span>
            </summary>
            <div class="border-t border-slate-200 bg-white p-2">
              <a
                v-if="filePreviewUrl(f)"
                class="mb-2 inline-block text-xs text-slate-500 underline hover:text-slate-800"
                :href="filePreviewUrl(f)"
                target="_blank"
                rel="noreferrer"
              >
                Открыть
              </a>
              <iframe
                v-if="filePreviewUrl(f)"
                :src="filePreviewUrl(f)"
                class="h-[520px] w-full rounded-md border border-slate-200"
              />
              <div v-else class="text-xs text-slate-600">
                Нет ссылки для предпросмотра.
              </div>
            </div>
          </details>
        </div>
      </div>
    </section>
  </div>
</template>

