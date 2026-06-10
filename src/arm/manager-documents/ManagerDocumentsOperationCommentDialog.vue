<script setup>
import { computed, ref, watch } from 'vue'

import { formatZ8Date } from '../../z8/z8Format.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  submitting: { type: Boolean, default: false },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
  signatureRequired: { type: Boolean, default: false },
  certificates: { type: Array, default: () => [] },
  certificatesLoading: { type: Boolean, default: false },
  certificatesError: { type: String, default: '' },
  selectedCertificateId: { type: String, default: '' },
})

const emit = defineEmits([
  'update:modelValue',
  'update:selectedCertificateId',
  'submit',
  'cancel',
])

const comment = ref('')

const canSubmit = computed(() => {
  if (props.submitting) return false
  if (props.required && !comment.value.trim()) return false
  if (props.signatureRequired && !props.selectedCertificateId) return false
  return true
})

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

function selectCertificate(cert) {
  const id = cert?.id
  if (id === undefined || id === null || !String(id).length) return
  emit('update:selectedCertificateId', String(id))
}

function confirm() {
  const certificate =
    props.signatureRequired && props.selectedCertificateId
      ? props.certificates.find((c) => String(c?.id) === String(props.selectedCertificateId)) ?? null
      : null
  emit('submit', { comment: comment.value, certificate })
}

function certValidity(cert) {
  const from = formatZ8Date(cert?.validFrom)
  const till = formatZ8Date(cert?.validTill)
  if (from && till) return `${from} — ${till}`
  if (from) return from
  if (till) return till
  return '—'
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
        class="w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        :class="signatureRequired ? 'max-w-2xl' : 'max-w-lg'"
        @click.stop
      >
        <div class="border-b border-slate-200 px-4 py-3">
          <h2 class="text-base font-semibold text-slate-900">{{ title || 'Комментарий' }}</h2>
        </div>

        <div class="max-h-[70vh] overflow-y-auto px-4 py-3">
          <div
            v-if="error"
            class="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {{ error }}
          </div>

          <div v-if="signatureRequired" class="mb-4 space-y-2">
            <p class="text-xs font-medium text-slate-600">Сертификат электронной подписи</p>

            <div
              v-if="certificatesLoading"
              class="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600"
            >
              Загрузка сертификатов…
            </div>

            <div
              v-else-if="certificatesError"
              class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {{ certificatesError }}
            </div>

            <div
              v-else-if="certificates.length === 0"
              class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
              Сертификаты не найдены. Убедитесь, что установлен КриптоПро и выбран действующий сертификат.
            </div>

            <ul v-else class="space-y-2">
              <li v-for="cert in certificates" :key="cert.id">
                <button
                  type="button"
                  class="w-full rounded-md border px-3 py-2 text-left transition-colors disabled:opacity-50"
                  :class="
                    String(cert.id) === String(selectedCertificateId)
                      ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-300'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  "
                  :disabled="submitting"
                  @click="selectCertificate(cert)"
                >
                  <div class="text-sm font-medium text-slate-900">
                    {{ cert.owner || '—' }}
                  </div>
                  <div class="mt-1 text-xs text-slate-600">
                    Серийный номер: {{ cert.serialNumber || '—' }}
                  </div>
                  <div class="mt-0.5 text-xs text-slate-600">
                    Действует: {{ certValidity(cert) }}
                  </div>
                  <div
                    v-if="cert.algorithm || cert.provider"
                    class="mt-0.5 text-xs text-slate-500"
                  >
                    <span v-if="cert.algorithm">{{ cert.algorithm }}</span>
                    <span v-if="cert.algorithm && cert.provider"> · </span>
                    <span v-if="cert.provider">{{ cert.provider }}</span>
                  </div>
                </button>
              </li>
            </ul>
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
            :disabled="!canSubmit"
            @click="confirm"
          >
            {{ submitting ? 'Отправка…' : 'Отправить' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
