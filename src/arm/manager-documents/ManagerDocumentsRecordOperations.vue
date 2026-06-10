<script setup>
defineProps({
  operations: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  submitting: { type: Boolean, default: false },
  stretch: { type: Boolean, default: false },
})

const emit = defineEmits(['run'])
</script>

<template>
  <button
    v-for="(op, index) in operations"
    :key="`${op.text ?? 'op'}-${index}`"
    type="button"
    class="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 transition-colors enabled:cursor-pointer enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
    :class="stretch ? 'flex-1 justify-center py-2.5' : ''"
    :disabled="disabled || submitting"
    @click="emit('run', op)"
  >
    {{ op.text }}
  </button>
</template>
