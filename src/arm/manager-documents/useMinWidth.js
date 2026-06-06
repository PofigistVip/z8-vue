import { onMounted, onUnmounted, ref } from 'vue'

export function useMinWidth(minWidth) {
  const matches = ref(
    typeof window !== 'undefined'
      ? window.matchMedia(`(min-width: ${minWidth}px)`).matches
      : true
  )

  let mq = null
  let onChange = null

  onMounted(() => {
    mq = window.matchMedia(`(min-width: ${minWidth}px)`)
    onChange = () => {
      matches.value = mq.matches
    }
    onChange()
    mq.addEventListener('change', onChange)
  })

  onUnmounted(() => {
    if (mq && onChange) {
      mq.removeEventListener('change', onChange)
    }
  })

  return { matches }
}
