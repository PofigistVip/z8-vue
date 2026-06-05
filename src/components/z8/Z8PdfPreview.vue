<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

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

let loadingTask = null
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

onBeforeUnmount(async () => {
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
  <div class="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-md border border-slate-200 bg-white">
    <div class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-slate-50 px-3 py-2 text-xs text-slate-700">
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded border border-slate-300 bg-white px-2 py-1 font-semibold hover:bg-slate-100 disabled:opacity-50"
          :disabled="loading || !canPrev"
          @click="prevPage"
        >
          ←
        </button>
        <button
          type="button"
          class="rounded border border-slate-300 bg-white px-2 py-1 font-semibold hover:bg-slate-100 disabled:opacity-50"
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
            :disabled="loading"
            @click="zoomIn"
          >
            +
          </button>
        </div>

        <button
          type="button"
          class="rounded border border-slate-300 bg-white px-2 py-1 font-semibold hover:bg-slate-100 disabled:opacity-50"
          :disabled="loading"
          @click="rotateLeft"
        >
          ⟲
        </button>
        <button
          type="button"
          class="rounded border border-slate-300 bg-white px-2 py-1 font-semibold hover:bg-slate-100 disabled:opacity-50"
          :disabled="loading"
          @click="rotateRight"
        >
          ⟳
        </button>

        <button
          type="button"
          class="rounded border border-slate-300 bg-white px-2 py-1 font-semibold hover:bg-slate-100 disabled:opacity-50"
          :disabled="loading"
          @click="printPdf"
        >
          Печать
        </button>
        <button
          type="button"
          class="rounded border border-slate-300 bg-white px-2 py-1 font-semibold hover:bg-slate-100 disabled:opacity-50"
          :disabled="loading"
          @click="download"
        >
          Загрузить
        </button>
      </div>
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
