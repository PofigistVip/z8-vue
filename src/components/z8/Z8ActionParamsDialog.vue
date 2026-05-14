<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  parameters: { type: Array, default: () => [] },
  submitting: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'submit', 'cancel'])

const visibleParams = computed(() =>
  (Array.isArray(props.parameters) ? props.parameters : []).filter((p) => p && p.visible !== false)
)

function close() {
  emit('update:modelValue', false)
  emit('cancel')
}

function confirm() {
  emit('submit')
}

function paramLabel(p) {
  if (p?.field && typeof p.field.header === 'string' && p.field.header) return p.field.header
  if (typeof p?.text === 'string' && p.text) return p.text
  if (typeof p?.id === 'string' && p.id) return p.id
  return '—'
}

function strValue(v) {
  if (v === null || v === undefined) return ''
  return String(v)
}

function onTextInput(p, ev) {
  p.value = ev.target.value
}

function onBoolInput(p, ev) {
  p.value = Boolean(ev.target.checked)
}

function onDatetimeInput(p, ev) {
  p.value = ev.target.value
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      :aria-label="title || 'Параметры действия'"
    >
      <div
        class="max-h-[min(90vh,32rem)] w-full max-w-lg overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        @click.stop
      >
        <div class="border-b border-slate-200 px-4 py-3">
          <h2 class="text-base font-semibold text-slate-900">{{ title || 'Параметры' }}</h2>
        </div>

        <div class="max-h-[min(70vh,24rem)] overflow-y-auto px-4 py-3">
          <div v-if="error" class="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {{ error }}
          </div>

          <div class="space-y-4">
            <div v-for="(p, idx) in visibleParams" :key="`${p.id ?? idx}`" class="space-y-1">
              <label class="block text-xs font-medium text-slate-600">{{ paramLabel(p) }}</label>

              <template v-if="p.type === 'boolean'">
                <label class="inline-flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-slate-300"
                    :checked="Boolean(p.value)"
                    @change="onBoolInput(p, $event)"
                  />
                  <span>да / нет</span>
                </label>
              </template>

              <input
                v-else-if="p.type === 'datetime'"
                type="datetime-local"
                class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                :value="strValue(p.value)"
                @input="onDatetimeInput(p, $event)"
              />

              <input
                v-else
                type="text"
                class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                :value="strValue(p.value)"
                @input="onTextInput(p, $event)"
              />
            </div>
          </div>
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
            {{ submitting ? 'Отправка…' : 'Выполнить' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
