export class Z8Client {
  constructor(options = {}) {
    this.url = options.url ?? '/request.json'
    this.session = options.session ?? '77CDEB34-AB2F-4ED7-A99E-81BCFDF86298'
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

    return await res.json()
  }

  async meta({
    request,
    id,
    period = { start: null, finish: null },
  }) {
    return await this.postForm({
      request,
      id,
      period,
      session: this.session,
    })
  }

  async read({
    request,
    start = 0,
    limit = 200,
    period = { start: null, finish: null },
  }) {
    return await this.postForm({
      action: 'read',
      request,
      period,
      start,
      limit,
      session: this.session,
    })
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
  }) {
    return await this.postForm({
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
    })
  }
}

