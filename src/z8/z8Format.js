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

function pad3(n) {
  return String(n).padStart(3, '0')
}

const Z8_API_DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/

export function isZ8ApiDateTimeString(value) {
  return typeof value === 'string' && Z8_API_DATETIME_RE.test(value)
}

/** @param {Date} d */
export function formatZ8ApiDateTimeFromDate(d) {
  const offsetMin = -d.getTimezoneOffset()
  const sign = offsetMin >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMin)
  const off = `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(d.getMilliseconds())}${off}`
}

export function serializeZ8DateForApi(value) {
  if (value === null || value === undefined || value === '') return ''
  const s = String(value)
  if (isZ8ApiDateTimeString(s)) return s
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, day] = s.split('-').map(Number)
    return formatZ8ApiDateTimeFromDate(new Date(y, m - 1, day, 0, 0, 0, 0))
  }
  const parsed = parseZ8Date(s)
  if (parsed) {
    return formatZ8ApiDateTimeFromDate(
      new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0)
    )
  }
  return s
}

export function serializeZ8DateTimeForApi(value) {
  if (value === null || value === undefined || value === '') return ''
  const s = String(value)
  if (isZ8ApiDateTimeString(s)) return s
  const parsed = parseZ8Date(s)
  if (parsed) return formatZ8ApiDateTimeFromDate(parsed)
  return s
}

export function serializeZ8ValueForApi(value, type) {
  if (type === 'date') return serializeZ8DateForApi(value)
  if (type === 'datetime') return serializeZ8DateTimeForApi(value)
  return value
}

function normalizeZ8ApiValue(v) {
  if (typeof v !== 'string' || v === '') return v
  if (isZ8ApiDateTimeString(v)) return v
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return serializeZ8DateForApi(v)
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return serializeZ8DateTimeForApi(v)
  return v
}

export function normalizeZ8DataForApi(data) {
  if (!Array.isArray(data)) return data
  return data.map((row) => {
    if (!row || typeof row !== 'object') return row
    const out = { ...row }
    for (const key of Object.keys(out)) {
      out[key] = normalizeZ8ApiValue(out[key])
    }
    return out
  })
}
