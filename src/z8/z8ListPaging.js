export function normalizeListColumn(item) {
  if (!item?.name) return null
  return {
    name: item.name,
    header: item.header ?? item.name,
    type: typeof item.type === 'string' ? item.type : 'string',
  }
}

export function normalizeListColumns(query) {
  if (!query) return []
  if (Array.isArray(query.columns) && query.columns.length) {
    return query.columns.map(normalizeListColumn).filter(Boolean)
  }
  if (Array.isArray(query.fields) && query.fields.length) {
    return query.fields.map(normalizeListColumn).filter(Boolean)
  }
  return []
}

/** Client-side filter property for non-server list data (listbox child rows). */
export function getClientLinkField(query, mode = 'listbox') {
  if (mode === 'combobox' || !query) return null
  return query.link?.name ?? (query.name ? `${query.name}.readerId` : null)
}

/**
 * @param {object} options
 * @param {object} [options.query]
 * @param {object} [options.link] - control-level link (combobox)
 * @param {object} [options.record]
 * @param {'listbox'|'combobox'} [options.mode]
 * @param {string} [options.displayFieldName] - combobox display column
 * @param {string} [options.sourceRequest] - override request from control.source
 */
export function buildReadQueryPaging({
  query,
  link,
  record,
  mode = 'listbox',
  displayFieldName,
  sourceRequest,
} = {}) {
  if (!query) return null
  const request = sourceRequest ?? query.request
  const queryName = query.name
  const recordId = record?.recordId
  if (!request || !queryName) return null
  if (mode === 'listbox' && !recordId) return null

  let filter = []
  if (mode === 'listbox') {
    const linkName = query.link?.name ?? (query.name ? `${query.name}.readerId` : null)
    if (linkName && recordId) {
      filter = [{ property: linkName, value: recordId }]
    }
  }

  let fields = Array.isArray(query.fields) ? query.fields.map((f) => f?.name).filter(Boolean) : []
  if (!fields.length && Array.isArray(query.columns)) {
    fields = query.columns.map((c) => c?.name).filter(Boolean)
  }
  if (!fields.length && mode === 'combobox') {
    const pk = link?.primaryKey ?? query.primaryKey
    fields = [displayFieldName, pk].filter(Boolean)
  }

  const sort = Array.isArray(query.sort) ? query.sort : []
  const values = recordId ? { recordId } : {}

  return {
    kind: 'readQuery',
    request,
    query: queryName,
    fields,
    filter,
    sort,
    values,
    limit: 200,
  }
}
