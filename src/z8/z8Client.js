import { pushInfoMessages } from '../stores/z8MessageStore.js'

export class Z8Client {
  constructor(options = {}) {
    this.url = options.url ?? '/request.json'
    this.session = options.session ?? null
  }

  setSession(session) {
    this.session = session && String(session).trim() ? String(session).trim() : null
  }

  requireSession() {
    if (!this.session) {
      throw new Error('Z8: session is not set. Log in first.')
    }
  }

  async postForm(fields) {
    const body = new URLSearchParams()
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined) continue
      body.set(k, typeof v === 'string' ? v : JSON.stringify(v))
    }

    const res = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Z8 request failed: ${res.status} ${res.statusText}${text ? `\n${text}` : ''}`)
    }

    const json = await res.json()
    pushInfoMessages(json?.info?.messages)
    return json
  }

  async login({ login, password }) {
    const payload = {
      request: 'login',
      login,
      experimental: 'true',
    }
    const pwd = typeof password === 'string' ? password.trim() : ''
    if (pwd) payload.password = pwd
    const json = await this.postForm(payload)
    if (json?.success !== true) {
      const msg =
        typeof json?.message === 'string'
          ? json.message
          : typeof json?.error === 'string'
            ? json.error
            : JSON.stringify(json ?? {})
      throw new Error(msg || 'Login failed')
    }
    return json
  }

  async meta({
    request,
    id,
    period = { start: null, finish: null },
  }) {
    this.requireSession()
    const fields = {
      request,
      period,
      session: this.session,
    }
    if (id !== undefined && id !== null && String(id).length > 0) {
      fields.id = id
    }
    return await this.postForm(fields)
  }

  async read({
    request,
    start = 0,
    limit = 200,
    period = { start: null, finish: null },
    count = false,
  }) {
    this.requireSession()
    const fields = {
      action: 'read',
      request,
      period,
      start,
      limit,
      session: this.session,
    }
    if (count) fields.count = 'true'
    return await this.postForm(fields)
  }

  async readQuery({
    request,
    query,
    fields,
    filter,
    sort,
    values,
    start = 0,
    limit = 200,
    action = 'read',
    count = false,
  }) {
    this.requireSession()
    const payload = {
      action,
      request,
      query,
      fields,
      filter,
      sort,
      values,
      start,
      limit,
      session: this.session,
    }
    if (count) payload.count = 'true'
    return await this.postForm(payload)
  }

  async create({
    request,
    data = [{ recordId: '00000000-0000-0000-0000-000000000000' }],
  }) {
    this.requireSession()
    const payload = Array.isArray(data) ? data : []
    const json = await this.postForm({
      request,
      action: 'create',
      data: payload,
      session: this.session,
    })
    if (json?.success !== true) {
      const msg =
        typeof json?.message === 'string'
          ? json.message
          : typeof json?.error === 'string'
            ? json.error
            : JSON.stringify(json ?? {})
      throw new Error(msg || 'Create failed')
    }
    return json
  }

  async destroy({ request, data }) {
    this.requireSession()
    const payload = Array.isArray(data) ? data : []
    const json = await this.postForm({
      request,
      action: 'destroy',
      data: payload,
      session: this.session,
    })
    if (json?.success !== true) {
      const msg =
        typeof json?.message === 'string'
          ? json.message
          : typeof json?.error === 'string'
            ? json.error
            : JSON.stringify(json ?? {})
      throw new Error(msg || 'Destroy failed')
    }
    return json
  }

  async action({ request, name, records, parameters = [] }) {
    this.requireSession()
    const rec = Array.isArray(records) ? records : []
    const params = Array.isArray(parameters) ? parameters : []
    const json = await this.postForm({
      request,
      action: 'action',
      name,
      records: rec,
      parameters: params,
      session: this.session,
    })
    if (json?.success !== true) {
      const msg =
        typeof json?.message === 'string'
          ? json.message
          : typeof json?.error === 'string'
            ? json.error
            : JSON.stringify(json ?? {})
      throw new Error(msg || 'Action failed')
    }
    return json
  }
}
