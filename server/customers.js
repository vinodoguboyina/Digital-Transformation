export const MAX_LOGO_BYTES = 2 * 1024 * 1024

export const DEFAULT_CUSTOMERS = [
  { id: 'tesa', name: 'Tesa', image: 'customers/tesa.svg' },
  { id: 'karakal-dubai', name: 'Karakal Dubai', image: 'customers/karakal-dubai.svg' },
  { id: 'eagle-bengaluru', name: 'Eagle Bengaluru', image: 'customers/eagle-bengaluru.svg' },
]

const LOGO_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
}

export function logoExt(name = '', mime = '') {
  const fromName = String(name).split('.').pop()?.toLowerCase()
  if (fromName && LOGO_TYPES[fromName]) return fromName === 'jpeg' ? 'jpg' : fromName
  if (mime === 'image/svg+xml' || mime.includes('svg')) return 'svg'
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  return ''
}

export function withCustomers(raw) {
  if (Array.isArray(raw)) {
    return { categories: [], solutions: raw, customers: DEFAULT_CUSTOMERS }
  }
  return {
    categories: Array.isArray(raw?.categories) ? raw.categories : [],
    solutions: Array.isArray(raw?.solutions) ? raw.solutions : [],
    customers: Array.isArray(raw?.customers) ? raw.customers : DEFAULT_CUSTOMERS,
  }
}
