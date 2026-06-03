import { Z8Http } from 'z8-http'

import { pushInfoMessages } from '../stores/z8MessageStore.js'
import { normalizeZ8DataForApi } from './z8Format.js'

const DEFAULT_CREATE_RECORD = {
  recordId: '00000000-0000-0000-0000-000000000000',
}

function errorMessage(json, fallback) {
  if (typeof json?.message === 'string') return json.message
  if (typeof json?.error === 'string') return json.error
  return JSON.stringify(json ?? {}) || fallback
}

function assertSuccess(json, fallback) {
  if (json?.success !== true) {
    throw new Error(errorMessage(json, fallback))
  }
  return json
}

export class Z8Client {
  constructor(options = {}) {
    this._http = new Z8Http({
      ...options,
      onMessages: options.onMessages ?? pushInfoMessages,
    })
  }

  setSession(session) {
    this._http.setSession(session)
  }

  requireSession() {
    this._http.requireSession()
  }

  async login({ login, password }) {
    const json = await this._http.login(login, password)
    return assertSuccess(json, 'Login failed')
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
      session: this._http.session,
    }
    if (id !== undefined && id !== null && String(id).length > 0) {
      fields.id = id
    }
    return await this._http.postForm(fields)
  }

  async read({
    request,
    start = 0,
    limit = 200,
    period = { start: null, finish: null },
    sort,
    count = false,
  }) {
    const options = { request, start, limit, period, sort }
    if (count) {
      return await this._http.count(options)
    }
    return await this._http.read(options)
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
    count = false,
  }) {
    const options = {
      request,
      query,
      fields,
      filter,
      sort,
      values,
      start,
      limit,
    }
    if (count) {
      return await this._http.count(options)
    }
    return await this._http.read(options)
  }

  async create({
    request,
    data = [DEFAULT_CREATE_RECORD],
  }) {
    const payload = normalizeZ8DataForApi(Array.isArray(data) ? data : [])
    const json = await this._http.create({ request, data: payload })
    return assertSuccess(json, 'Create failed')
  }

  async destroy({ request, data }) {
    const rows = Array.isArray(data) ? data : []
    const ids = rows
      .map((r) => r?.recordId)
      .filter((id) => id !== undefined && id !== null && String(id).length > 0)
    const json = await this._http.destroy({ request, ids })
    return assertSuccess(json, 'Destroy failed')
  }

  async update({ request, data }) {
    const payload = normalizeZ8DataForApi(Array.isArray(data) ? data : [])
    const json = await this._http.update({ request, data: payload })
    return assertSuccess(json, 'Update failed')
  }

  async action({ request, name, records, parameters = [] }) {
    const rec = Array.isArray(records) ? records : []
    const params = Array.isArray(parameters) ? parameters : []
    const json = await this._http.action({
      request,
      name,
      records: rec,
      parameters: params,
    })
    return assertSuccess(json, 'Action failed')
  }

  async job({
    request,
    period = { start: null, finish: null },
    pollIntervalMs,
  } = {}) {
    const options = { request, period }
    if (pollIntervalMs !== undefined) options.pollIntervalMs = pollIntervalMs
    return await this._http.job(options)
  }
}
