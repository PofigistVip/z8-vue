<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'

import { formatZ8UnixCellValue } from '../z8/z8Format.js'

const TOOLTIP_GAP = 8

const emit = defineEmits(['hover-enter', 'hover-leave'])

const props = defineProps({
  visible: { type: Boolean, default: false },
  anchor: { type: Object, default: null },
  row: { type: Object, default: null },
  formatField: { type: Function, required: true },
})

const TOOLTIP_FIELDS = [
  { label: 'Кому', key: 'кому.shortNameExpr' },
  { label: 'ОВУ автора', key: 'ОВУАвтора' },
  { label: 'Исполнитель', key: 'исполнитель.shortNameExpr' },
  { label: 'Заголовок', key: 'заголовок', textarea: true, rows: 2 },
  { label: 'Срочность', key: 'срочность.name' },
  { label: 'Исходящий номер', key: 'исхНомерExpr' },
  { label: 'Дата регистрации', key: 'датаРег' },
  { label: 'Краткое содержание', key: 'краткоеСодержание', textarea: true, rows: 4 },
]

const cardRef = ref(null)
const positionTop = ref(0)
let resizeObserver = null

function getNestedValue(obj, path) {
  if (!obj || typeof obj !== 'object') return undefined
  if (Object.prototype.hasOwnProperty.call(obj, path)) return obj[path]
  return path.split('.').reduce((acc, part) => acc?.[part], obj)
}

function formatFallbackValue(raw) {
  if (raw === null || raw === undefined || raw === '') return '—'
  if (typeof raw === 'object') return '—'
  return String(raw)
}

function displayValue(key) {
  if (key === 'датаРег') {
    return formatZ8UnixCellValue(getNestedValue(props.row, key))
  }
  const formatted = props.formatField(key)
  if (formatted && formatted !== '—') return formatted
  const raw = getNestedValue(props.row, key)
  return formatFallbackValue(raw)
}

const fieldValues = computed(() =>
  TOOLTIP_FIELDS.map((field) => ({
    ...field,
    value: props.visible && props.row ? displayValue(field.key) : '—',
  }))
)

const wrapperStyle = computed(() => {
  const anchor = props.anchor
  if (!anchor) return {}
  return {
    top: `${positionTop.value}px`,
    left: `${anchor.right}px`,
  }
})

const bridgeStyle = computed(() => {
  const anchor = props.anchor
  if (!anchor) return {}
  return {
    width: `${TOOLTIP_GAP}px`,
    height: `${anchor.height}px`,
  }
})

const cardStyle = computed(() => ({
  left: `${TOOLTIP_GAP}px`,
}))

function updatePosition() {
  const anchor = props.anchor
  if (!anchor) return

  let top = anchor.top
  const el = cardRef.value
  if (el) {
    const height = el.offsetHeight
    const maxTop = window.innerHeight - height - TOOLTIP_GAP
    if (top > maxTop) top = Math.max(TOOLTIP_GAP, maxTop)
  }

  positionTop.value = top
}

function disconnectResizeObserver() {
  resizeObserver?.disconnect()
  resizeObserver = null
}

function connectResizeObserver() {
  disconnectResizeObserver()
  const el = cardRef.value
  if (!el || typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(() => {
    updatePosition()
  })
  resizeObserver.observe(el)
}

watch(
  () => [props.visible, props.anchor, props.row],
  () => {
    if (!props.visible) {
      disconnectResizeObserver()
      return
    }
    void nextTick(() => {
      updatePosition()
      connectResizeObserver()
    })
  },
  { immediate: true }
)

onUnmounted(() => {
  disconnectResizeObserver()
})
</script>

<template>
  <div
    v-if="visible && anchor && row"
    class="fixed z-50"
    :style="wrapperStyle"
  >
    <div
      class="absolute left-0 top-0"
      :style="bridgeStyle"
      aria-hidden="true"
      @mouseenter="emit('hover-enter')"
      @mouseleave="emit('hover-leave')"
    />

    <div
      ref="cardRef"
      class="absolute top-0 w-[30rem] max-w-[calc(100vw-16px)] rounded-lg border border-slate-200 bg-white shadow-lg"
      :style="cardStyle"
      role="tooltip"
      @mouseenter="emit('hover-enter')"
      @mouseleave="emit('hover-leave')"
    >
      <div class="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
        <svg
          class="h-4 w-4 shrink-0 text-sky-600"
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
        <div class="text-sm font-semibold text-slate-800">Реквизиты</div>
      </div>

      <div class="flex flex-col gap-3 px-3 py-3">
        <div
          v-for="field in fieldValues"
          :key="field.key"
          class="min-w-0"
        >
          <div class="text-xs text-slate-500">{{ field.label }}</div>
          <textarea
            v-if="field.textarea"
            readonly
            :value="field.value"
            :rows="field.rows ?? 3"
            class="mt-0.5 min-h-[1lh] w-full resize-y overflow-y-auto border-0 bg-transparent p-0 text-sm text-slate-800 shadow-none focus:outline-none focus:ring-0"
          />
          <div
            v-else
            class="mt-0.5 text-sm text-slate-800"
          >
            {{ field.value }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
