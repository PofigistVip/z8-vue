<script setup>
defineProps({
  operations: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  submitting: { type: Boolean, default: false },
  stretch: { type: Boolean, default: false },
})

const emit = defineEmits(['run'])

function operationVariant(op) {
  const result = typeof op?.result === 'number' ? op.result : Number(op?.result)
  if (Number.isFinite(result)) {
    if (result > 0) return 'approve'
    if (result < 0) return 'decline'
  }
  const text = typeof op?.text === 'string' ? op.text.trim() : ''
  if (text === 'Согласовать') return 'approve'
  if (text === 'Отклонить') return 'decline'
  return 'default'
}

function buttonClass(variant, stretch) {
  const base =
    'inline-flex items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors enabled:cursor-pointer disabled:cursor-not-allowed'
  const size = stretch ? 'flex-1 justify-center py-2.5' : 'py-1.5'

  if (variant === 'approve') {
    return `${base} ${size} enabled:border-emerald-300 enabled:bg-emerald-50 enabled:text-emerald-800 enabled:hover:bg-emerald-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400`
  }
  if (variant === 'decline') {
    return `${base} ${size} enabled:border-red-300 enabled:bg-red-50 enabled:text-red-800 enabled:hover:bg-red-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400`
  }
  return `${base} ${size} border-slate-300 bg-white text-slate-800 enabled:hover:bg-slate-50 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400`
}
</script>

<template>
  <div
    class="flex items-center gap-2"
    :class="stretch ? 'w-full min-h-11' : 'min-h-9'"
  >
    <button
      v-for="(op, index) in operations"
      :key="`${op.text ?? 'op'}-${index}`"
      type="button"
      :class="buttonClass(operationVariant(op), stretch)"
      :disabled="disabled || submitting"
      @click="emit('run', op)"
    >
      <svg
        v-if="operationVariant(op) === 'approve'"
        class="h-4 w-4 shrink-0"
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
      <svg
        v-else-if="operationVariant(op) === 'decline'"
        class="h-4 w-4 shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
        />
      </svg>
      {{ op.text }}
    </button>
  </div>
</template>
