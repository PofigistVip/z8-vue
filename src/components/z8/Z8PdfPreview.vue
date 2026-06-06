<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

const ICON_BTN_CLASS =
  'inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50'

const props = defineProps({
  src: { type: String, required: true },
  filename: { type: String, default: 'document.pdf' },
  initialPage: { type: Number, default: 1 },
  minScale: { type: Number, default: 0.5 },
  maxScale: { type: Number, default: 3 },
})

const scrollContainerRef = ref(null)
const pageCanvasRefs = new Map()

const loading = ref(false)
const error = ref('')

const pageNumber = ref(1)
const pageCount = ref(0)
const scale = ref(1)
const rotation = ref(0)
const fullscreenOpen = ref(false)

let loadingTask = null
let previousBodyOverflow = ''
let pdfDoc = null
const renderTasks = new Set()
let scrollSyncFromUser = false
let scrollSyncTimer = null

const canPrev = computed(() => pageNumber.value > 1)
const canNext = computed(() => pageCount.value > 0 && pageNumber.value < pageCount.value)

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function normalizeRotation(deg) {
  let r = deg % 360
  if (r < 0) r += 360
  return r
}

function setPageCanvasRef(pageNum, el) {
  if (el) {
    pageCanvasRefs.set(pageNum, el)
  } else {
    pageCanvasRefs.delete(pageNum)
  }
}

function cancelRenderTasks() {
  for (const task of renderTasks) {
    try {
      task.cancel()
    } catch {
      // ignore
    }
  }
  renderTasks.clear()
}

async function renderAllPages() {
  if (!pdfDoc) return

  cancelRenderTasks()

  for (let pageNum = 1; pageNum <= pageCount.value; pageNum += 1) {
    const canvas = pageCanvasRefs.get(pageNum)
    if (!canvas) continue

    const page = await pdfDoc.getPage(pageNum)
    const viewport = page.getViewport({ scale: scale.value, rotation: rotation.value })
    const ctx = canvas.getContext('2d', { alpha: false })
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)

    const task = page.render({ canvasContext: ctx, viewport })
    renderTasks.add(task)
    try {
      await task.promise
    } catch (e) {
      if (e?.name !== 'RenderingCancelledException') {
        throw e
      }
    } finally {
      renderTasks.delete(task)
    }
  }
}

function getVisiblePage() {
  const container = scrollContainerRef.value
  if (!container || pageCount.value === 0) return 1

  const containerRect = container.getBoundingClientRect()
  const containerTop = containerRect.top
  const containerBottom = containerRect.bottom
  const containerHeight = containerRect.height

  let bestPage = 1
  let bestVisible = 0

  for (let pageNum = 1; pageNum <= pageCount.value; pageNum += 1) {
    const canvas = pageCanvasRefs.get(pageNum)
    if (!canvas) continue

    const rect = canvas.getBoundingClientRect()
    const visibleTop = Math.max(rect.top, containerTop)
    const visibleBottom = Math.min(rect.bottom, containerBottom)
    const visible = Math.max(0, visibleBottom - visibleTop)

    if (visible > bestVisible) {
      bestVisible = visible
      bestPage = pageNum
    } else if (visible === bestVisible && visible > 0 && pageNum < bestPage) {
      bestPage = pageNum
    }
  }

  if (bestVisible === 0 && containerHeight > 0) {
    let closestDist = Infinity
    for (let pageNum = 1; pageNum <= pageCount.value; pageNum += 1) {
      const canvas = pageCanvasRefs.get(pageNum)
      if (!canvas) continue
      const rect = canvas.getBoundingClientRect()
      const dist = Math.abs(rect.top - containerTop)
      if (dist < closestDist) {
        closestDist = dist
        bestPage = pageNum
      }
    }
  }

  return bestPage
}

function onScroll() {
  if (scrollSyncFromUser) return

  const visible = getVisiblePage()
  if (visible !== pageNumber.value) {
    pageNumber.value = visible
  }
}

function scrollToPage(pageNum, behavior = 'smooth') {
  const container = scrollContainerRef.value
  const canvas = pageCanvasRefs.get(pageNum)
  if (!container || !canvas) return

  scrollSyncFromUser = true
  const top =
    canvas.getBoundingClientRect().top -
    container.getBoundingClientRect().top +
    container.scrollTop
  container.scrollTo({
    top,
    behavior: behavior === 'smooth' ? 'smooth' : 'auto',
  })
  pageNumber.value = pageNum

  if (scrollSyncTimer) {
    window.clearTimeout(scrollSyncTimer)
  }
  scrollSyncTimer = window.setTimeout(() => {
    scrollSyncFromUser = false
    scrollSyncTimer = null
  }, behavior === 'smooth' ? 400 : 50)
}

async function loadPdf() {
  const url = String(props.src || '').trim()
  if (!url) return

  error.value = ''
  loading.value = true

  cancelRenderTasks()
  pageCanvasRefs.clear()

  if (loadingTask) {
    try {
      loadingTask.destroy()
    } catch {
      // ignore
    }
    loadingTask = null
  }
  if (pdfDoc) {
    try {
      await pdfDoc.destroy()
    } catch {
      // ignore
    }
    pdfDoc = null
  }

  try {
    loadingTask = pdfjsLib.getDocument({ url, withCredentials: true })
    pdfDoc = await loadingTask.promise
    pageCount.value = Number(pdfDoc.numPages) || 0
    const initial = clamp(Number(props.initialPage) || 1, 1, pageCount.value || 1)
    pageNumber.value = initial

    await nextTick()
    await renderAllPages()
    await nextTick()
    scrollToPage(initial, 'instant')
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    pageCount.value = 0
  } finally {
    loading.value = false
  }
}

function prevPage() {
  if (!canPrev.value) return
  scrollToPage(pageNumber.value - 1)
}

function nextPage() {
  if (!canNext.value) return
  scrollToPage(pageNumber.value + 1)
}

function onPageInput() {
  const target = clamp(Number(pageNumber.value) || 1, 1, pageCount.value || 1)
  pageNumber.value = target
  scrollToPage(target)
}

function zoomOut() {
  scale.value = clamp(Number(scale.value) - 0.1, props.minScale, props.maxScale)
}

function zoomIn() {
  scale.value = clamp(Number(scale.value) + 0.1, props.minScale, props.maxScale)
}

function rotateLeft() {
  rotation.value = normalizeRotation(rotation.value - 90)
}

function rotateRight() {
  rotation.value = normalizeRotation(rotation.value + 90)
}

async function fetchBlob() {
  const res = await fetch(props.src, { credentials: 'include' })
  if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status} ${res.statusText}`)
  return await res.blob()
}

async function download() {
  try {
    const blob = await fetchBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = props.filename || 'document.pdf'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

function toggleFullscreen() {
  fullscreenOpen.value = !fullscreenOpen.value
}

function closeFullscreen() {
  fullscreenOpen.value = false
}

function onFullscreenKeydown(event) {
  if (event.key === 'Escape') {
    closeFullscreen()
  }
}

function setBodyScrollLocked(locked) {
  if (locked) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onFullscreenKeydown)
  } else {
    document.body.style.overflow = previousBodyOverflow
    window.removeEventListener('keydown', onFullscreenKeydown)
  }
}

async function printPdf() {
  try {
    const blob = await fetchBlob()
    const url = URL.createObjectURL(blob)

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.src = url
    document.body.appendChild(iframe)

    const cleanup = () => {
      iframe.remove()
      URL.revokeObjectURL(url)
    }

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } finally {
        window.setTimeout(cleanup, 1000)
      }
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

watch(
  () => props.src,
  () => loadPdf(),
  { immediate: true }
)

watch([scale, rotation], async () => {
  if (!pdfDoc || loading.value) return
  try {
    await renderAllPages()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
})

watch(fullscreenOpen, async (open, wasOpen) => {
  setBodyScrollLocked(open)
  if (wasOpen && !open && pdfDoc && !loading.value) {
    await nextTick()
    try {
      await renderAllPages()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
  }
})

onBeforeUnmount(async () => {
  if (fullscreenOpen.value) {
    setBodyScrollLocked(false)
    fullscreenOpen.value = false
  }
  if (scrollSyncTimer) {
    window.clearTimeout(scrollSyncTimer)
    scrollSyncTimer = null
  }

  cancelRenderTasks()
  pageCanvasRefs.clear()

  if (loadingTask) {
    try {
      loadingTask.destroy()
    } catch {
      // ignore
    }
  }
  if (pdfDoc) {
    try {
      await pdfDoc.destroy()
    } catch {
      // ignore
    }
  }
})
</script>

<template>
  <div
    class="flex flex-col overflow-hidden bg-white"
    :class="
      fullscreenOpen
        ? 'fixed inset-0 z-50 min-h-0 w-full'
        : 'min-h-0 w-full flex-1 rounded-md border border-slate-200'
    "
  >
    <div class="relative flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-slate-50 px-3 py-2 text-xs text-slate-700">
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded border border-slate-300 bg-white px-2 py-1 font-semibold hover:bg-slate-100 disabled:opacity-50"
          title="Предыдущая страница"
          aria-label="Предыдущая страница"
          :disabled="loading || !canPrev"
          @click="prevPage"
        >
          ←
        </button>
        <button
          type="button"
          class="rounded border border-slate-300 bg-white px-2 py-1 font-semibold hover:bg-slate-100 disabled:opacity-50"
          title="Следующая страница"
          aria-label="Следующая страница"
          :disabled="loading || !canNext"
          @click="nextPage"
        >
          →
        </button>
        <div class="flex items-center gap-1">
          <input
            v-model.number="pageNumber"
            type="number"
            class="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300"
            :min="1"
            :max="pageCount || 1"
            :disabled="loading || pageCount === 0"
            @change="onPageInput"
            @keydown.enter.prevent="onPageInput"
          />
          <span class="text-slate-500">/ {{ pageCount || '—' }}</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="rounded border border-slate-300 bg-white px-2 py-1 font-semibold hover:bg-slate-100 disabled:opacity-50"
            title="Уменьшить"
            aria-label="Уменьшить"
            :disabled="loading"
            @click="zoomOut"
          >
            −
          </button>
          <span class="min-w-[4rem] text-center tabular-nums text-slate-600">
            {{ Math.round(scale * 100) }}%
          </span>
          <button
            type="button"
            class="rounded border border-slate-300 bg-white px-2 py-1 font-semibold hover:bg-slate-100 disabled:opacity-50"
            title="Увеличить"
            aria-label="Увеличить"
            :disabled="loading"
            @click="zoomIn"
          >
            +
          </button>
        </div>

        <button
          type="button"
          class="rounded border border-slate-300 bg-white px-2 py-1 font-semibold hover:bg-slate-100 disabled:opacity-50"
          title="Повернуть влево"
          aria-label="Повернуть влево"
          :disabled="loading"
          @click="rotateLeft"
        >
          ⟲
        </button>
        <button
          type="button"
          class="rounded border border-slate-300 bg-white px-2 py-1 font-semibold hover:bg-slate-100 disabled:opacity-50"
          title="Повернуть вправо"
          aria-label="Повернуть вправо"
          :disabled="loading"
          @click="rotateRight"
        >
          ⟳
        </button>

        <button
          type="button"
          :class="ICON_BTN_CLASS"
          :title="fullscreenOpen ? 'Закрыть полный экран' : 'На весь экран'"
          :aria-label="fullscreenOpen ? 'Закрыть полный экран' : 'На весь экран'"
          :disabled="loading || pageCount === 0"
          @click="toggleFullscreen"
        >
          <svg
            v-if="fullscreenOpen"
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
          <path fill-rule="evenodd" d="M3.22 3.22a.75.75 0 0 1 1.06 0l3.97 3.97V4.5a.75.75 0 0 1 1.5 0V9a.75.75 0 0 1-.75.75H4.5a.75.75 0 0 1 0-1.5h2.69L3.22 4.28a.75.75 0 0 1 0-1.06Zm17.56 0a.75.75 0 0 1 0 1.06l-3.97 3.97h2.69a.75.75 0 0 1 0 1.5H15a.75.75 0 0 1-.75-.75V4.5a.75.75 0 0 1 1.5 0v2.69l3.97-3.97a.75.75 0 0 1 1.06 0ZM3.75 15a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-2.69l-3.97 3.97a.75.75 0 0 1-1.06-1.06l3.97-3.97H4.5a.75.75 0 0 1-.75-.75Zm10.5 0a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-2.69l3.97 3.97a.75.75 0 1 1-1.06 1.06l-3.97-3.97v2.69a.75.75 0 0 1-1.5 0V15Z" clip-rule="evenodd" />
          </svg>
          <svg
            v-else
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
          <path fill-rule="evenodd" d="M15 3.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0V5.56l-3.97 3.97a.75.75 0 1 1-1.06-1.06l3.97-3.97h-2.69a.75.75 0 0 1-.75-.75Zm-12 0A.75.75 0 0 1 3.75 3h4.5a.75.75 0 0 1 0 1.5H5.56l3.97 3.97a.75.75 0 0 1-1.06 1.06L4.5 5.56v2.69a.75.75 0 0 1-1.5 0v-4.5Zm11.47 11.78a.75.75 0 1 1 1.06-1.06l3.97 3.97v-2.69a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1 0-1.5h2.69l-3.97-3.97Zm-4.94-1.06a.75.75 0 0 1 0 1.06L5.56 19.5h2.69a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 1 1.5 0v2.69l3.97-3.97a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" />
          </svg>
        </button>
        <button
          type="button"
          :class="ICON_BTN_CLASS"
          title="Печать"
          aria-label="Печать"
          :disabled="loading"
          @click="printPdf"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M7.875 1.5C6.839 1.5 6 2.34 6 3.375v2.99c-.426.053-.851.11-1.274.174-1.454.218-2.476 1.483-2.476 2.917v6.294a3 3 0 0 0 3 3h.27l-.155 1.705A1.875 1.875 0 0 0 7.232 22.5h9.536a1.875 1.875 0 0 0 1.867-2.045l-.155-1.705h.27a3 3 0 0 0 3-3V9.456c0-1.434-1.022-2.7-2.476-2.917A48.716 48.716 0 0 0 18 6.366V3.375c0-1.036-.84-1.875-1.875-1.875h-8.25ZM16.5 6.205v-2.83A.375.375 0 0 0 16.125 3h-8.25a.375.375 0 0 0-.375.375v2.83a49.353 49.353 0 0 1 9 0Zm-.217 8.265c.178.018.317.16.333.337l.526 5.784a.375.375 0 0 1-.374.409H7.232a.375.375 0 0 1-.374-.409l.526-5.784a.373.373 0 0 1 .333-.337 41.741 41.741 0 0 1 8.566 0Zm.967-3.97a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H18a.75.75 0 0 1-.75-.75V10.5ZM15 9.75a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75V10.5a.75.75 0 0 0-.75-.75H15Z" clip-rule="evenodd" />
          </svg>
        </button>
        <button
          type="button"
          :class="ICON_BTN_CLASS"
          title="Загрузить"
          aria-label="Загрузить"
          :disabled="loading"
          @click="download"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 1 0-1.09-1.03l-2.955 3.129V2.75zM3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"
            />
          </svg>
        </button>
      </div>

      <button
        v-if="fullscreenOpen"
        type="button"
        class="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
        title="Закрыть"
        aria-label="Закрыть"
        @click="closeFullscreen"
      >
        <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
          />
        </svg>
      </button>
    </div>

    <div
      ref="scrollContainerRef"
      class="min-h-0 flex-1 overflow-y-auto bg-white p-2"
      @scroll="onScroll"
    >
      <div v-if="error" class="mb-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-800">
        {{ error }}
      </div>
      <div v-if="loading" class="py-4 text-center text-sm text-slate-600">
        Загрузка…
      </div>
      <div v-show="!loading && pageCount > 0" class="mx-auto flex w-full max-w-full flex-col items-center gap-3">
        <canvas
          v-for="n in pageCount"
          :key="n"
          :ref="(el) => setPageCanvasRef(n, el)"
          :data-page="n"
          class="block max-w-full shadow-sm"
        />
      </div>
    </div>
  </div>
</template>
