<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  submitting: { type: Boolean, default: false },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'submit', 'cancel'])

const comment = ref('')

watch(
  () => props.modelValue,
  (open) => {
    if (open) comment.value = ''
  }
)

function close() {
  emit('update:modelValue', false)
  emit('cancel')
}

function confirm() {
  emit('submit', comment.value)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      :aria-label="title || 'Комментарий'"
    >
      <div
        class="w-full max-w-lg overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        @click.stop
      >
        <div class="border-b border-slate-200 px-4 py-3">
          <h2 class="text-base font-semibold text-slate-900">{{ title || 'Комментарий' }}</h2>
        </div>

        <div class="px-4 py-3">
          <div
            v-if="error"
            class="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {{ error }}
          </div>

          <label class="block space-y-1">
            <span class="text-xs font-medium text-slate-600">
              Комментарий<span v-if="required" class="text-red-600"> *</span>
            </span>
            <textarea
              v-model="comment"
              rows="4"
              class="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              :disabled="submitting"
            />
          </label>
        </div>

        <div class="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            type="button"
            class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            :disabled="submitting"
            @click="close"
          >
            Отмена
          </button>
          <button
            type="button"
            class="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            :disabled="submitting"
            @click="confirm"
          >
            {{ submitting ? 'Отправка…' : 'Отправить' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
