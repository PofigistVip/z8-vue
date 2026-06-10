let homerLoadPromise = null

function getCryptoPro() {
  if (typeof window === 'undefined') return null
  return window.CryptoPro ?? window.cadesplugin ?? null
}

export function ensureHomerLoaded() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('CryptoPro недоступен в этой среде.'))
  }
  if (getCryptoPro()) return Promise.resolve(getCryptoPro())

  if (!homerLoadPromise) {
    homerLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-homer-js]')
      if (existing) {
        existing.addEventListener('load', () => {
          const cp = getCryptoPro()
          cp ? resolve(cp) : reject(new Error('CryptoPro не инициализирован после загрузки homer.js.'))
        })
        existing.addEventListener('error', () => {
          reject(new Error('Не удалось загрузить homer.js.'))
        })
        return
      }

      const script = document.createElement('script')
      script.src = '/homer/homer.js'
      script.async = true
      script.dataset.homerJs = 'true'
      script.onload = () => {
        const cp = getCryptoPro()
        cp ? resolve(cp) : reject(new Error('CryptoPro не инициализирован после загрузки homer.js.'))
      }
      script.onerror = () => {
        homerLoadPromise = null
        reject(new Error('Не удалось загрузить homer.js.'))
      }
      document.head.appendChild(script)
    })
  }

  return homerLoadPromise
}

function arrayBufferToBase64(buffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

export async function fetchFileBase64(file, session) {
  const path = typeof file?.path === 'string' ? file.path : ''
  const id = typeof file?.id === 'string' ? file.id : ''
  const sess = typeof session === 'string' ? session : ''
  if (!path || !id || !sess) {
    throw new Error('Не удалось загрузить файл для подписи.')
  }

  const url = `${window.location.origin}/${path}?id=${id}&session=${sess}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Не удалось загрузить файл для подписи: ${res.status}`)
  }
  const buffer = await res.arrayBuffer()
  return arrayBufferToBase64(buffer)
}

export async function loadCertificates() {
  const CryptoPro = await ensureHomerLoaded()
  return new Promise((resolve, reject) => {
    CryptoPro.loadCertificates(
      (certs) => resolve(Array.isArray(certs) ? certs : []),
      (err) => {
        const msg =
          typeof err === 'string'
            ? err
            : err instanceof Error
              ? err.message
              : 'Не настроена возможность подписания файлов электронной подписью.'
        reject(new Error(msg))
      }
    )
  })
}

export async function signFile(thumbprint, file, session) {
  const CryptoPro = await ensureHomerLoaded()
  const base64 = await fetchFileBase64(file, session)
  const certId = typeof thumbprint === 'string' ? thumbprint : String(thumbprint ?? '')

  return new Promise((resolve, reject) => {
    CryptoPro.sign(
      certId,
      base64,
      (signature) => resolve(signature),
      (err) => {
        const msg =
          typeof err === 'string'
            ? err
            : err instanceof Error
              ? err.message
              : 'Не удалось создать подпись.'
        reject(new Error(msg))
      }
    )
  })
}
