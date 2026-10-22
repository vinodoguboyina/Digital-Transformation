export const MAX_FLYER_BYTES = 25 * 1024 * 1024
export const FLYER_CHUNK_BYTES = 3 * 1024 * 1024

export function flyerSizeError() {
  return 'File is too large. Use a file under 25 MB.'
}

export function readRawBody(req, maxBytes = FLYER_CHUNK_BYTES + 1024 * 64) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBytes) {
        reject(new Error(flyerSizeError()))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export function flyerUploadMeta(req) {
  const headerName = String(req.headers['x-flyer-name'] || 'flyer')
  let name = headerName
  try {
    name = decodeURIComponent(headerName)
  } catch {
    name = headerName
  }
  return {
    name: flyerName(name),
    mime: String(req.headers['content-type'] || '').split(';')[0].trim(),
    id: String(req.headers['x-flyer-id'] || '').trim(),
    index: Number(req.headers['x-chunk-index'] || 0),
    count: Math.max(1, Number(req.headers['x-chunk-count'] || 1)),
    uploadId: String(req.headers['x-upload-id'] || ''),
    shas: String(req.headers['x-chunk-shas'] || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  }
}

export const FLYER_TYPES = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  txt: 'text/plain',
  csv: 'text/csv',
  rtf: 'application/rtf',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
}

export function flyerExt(name = '', mime = '') {
  const fromName = String(name).split('.').pop()?.toLowerCase()
  if (fromName && FLYER_TYPES[fromName]) return fromName
  const found = Object.entries(FLYER_TYPES).find(([, type]) => type === mime)
  return found?.[0] || ''
}

export function parseDataFile(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;,]+)?(?:;[^,]*)?;base64,(.+)$/)
  if (!match) return null
  return { mime: match[1] || '', buffer: Buffer.from(match[2], 'base64') }
}

export function flyerName(name) {
  const value = String(name || '').replace(/[/\\]/g, '').trim()
  return value || 'flyer'
}

export function listFlyers(item) {
  return Array.isArray(item?.flyers) ? item.flyers : []
}
