function pad2(n) {
  return String(n).padStart(2, '0')
}

export function parseZ8Date(raw) {
  if (raw === null || raw === undefined || raw === '') return null
  const ts = Date.parse(String(raw))
  return Number.isNaN(ts) ? null : new Date(ts)
}

export function formatZ8Date(raw) {
  const d = parseZ8Date(raw)
  if (!d) return raw == null || raw === '' ? '' : String(raw)
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`
}

export function formatZ8DateTime(raw) {
  const d = parseZ8Date(raw)
  if (!d) return raw == null || raw === '' ? '' : String(raw)
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function formatZ8DisplayValue(raw, type) {
  if (raw === null || raw === undefined || raw === '') return ''
  if (type === 'date') return formatZ8Date(raw)
  if (type === 'datetime') return formatZ8DateTime(raw)
  if (typeof raw === 'boolean') return raw ? 'true' : 'false'
  return String(raw)
}

export function formatZ8CellValue(raw, type) {
  if (raw === null || raw === undefined || raw === '') return '—'
  return formatZ8DisplayValue(raw, type) || '—'
}
