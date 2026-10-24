import { randomUUID } from 'node:crypto'
import { DEFAULT_CUSTOMERS, MAX_LOGO_BYTES, logoExt, withCustomers } from './customers.js'
import {
  FLYER_CHUNK_BYTES,
  FLYER_TYPES,
  MAX_FLYER_BYTES,
  flyerExt,
  flyerName,
  flyerSizeError,
  flyerUploadMeta,
  listFlyers,
  parseDataFile,
  readRawBody,
} from './flyers.js'

const REPO = 'vinodoguboyina/Digital-Transformation'
const BRANCH = 'main'

function safeId(id) {
  return String(id).replace(/[^a-zA-Z0-9_]/g, '_')
}

function normalize(raw) {
  return withCustomers(raw)
}

function buildSource(catalog) {
  const items = catalog.solutions
  const imports = items
    .filter((item) => item.image)
    .map((item) => `import img_${safeId(item.id)} from '../assets/${item.image.replaceAll('\\', '/')}'`)
    .join('\n')
  const body = items
    .map(
      (item) => `  {
    id: ${JSON.stringify(item.id)},
    title: ${JSON.stringify(item.title)},
    text: ${JSON.stringify(item.text)},
    category: ${JSON.stringify(item.category || '')},
    url: ${JSON.stringify(item.url || '')},
    image: ${item.image ? `img_${safeId(item.id)}` : '""'},
    flyers: ${JSON.stringify(listFlyers(item))},
  }`,
    )
    .join(',\n')
  const list = body ? `\n${body},\n` : '\n'
  const customers = Array.isArray(catalog.customers) ? catalog.customers : DEFAULT_CUSTOMERS
  const publicCustomers = customers.map((customer) => ({
    ...customer,
    image: customer.image ? `/${String(customer.image).replaceAll('\\', '/').replace(/^\//, '')}` : '',
  }))
  return `${imports}\n\nexport const categories = ${JSON.stringify(catalog.categories, null, 2)}\n\nexport const solutions = [${list}]\n\nexport const customers = ${JSON.stringify(publicCustomers, null, 2)}\n\nif (import.meta.hot) {\n  import.meta.hot.accept()\n}\n`
}

function publicImage(image) {
  if (!image) return ''
  const normalized = image.replaceAll('\\', '/')
  return `https://raw.githubusercontent.com/${REPO}/${BRANCH}/src/assets/${normalized}`
}

function publicFlyer(flyer, urlOverride) {
  return {
    id: flyer.id,
    name: flyer.name,
    type: flyer.type || '',
    file: flyer.file,
    url: urlOverride || `https://raw.githubusercontent.com/${REPO}/${BRANCH}/public/flyers/${flyer.file}`,
  }
}

function toPublic(item, imageOverride) {
  return {
    id: item.id,
    title: item.title,
    text: item.text,
    category: item.category || '',
    url: item.url || '',
    image: imageOverride || publicImage(item.image),
    flyers: listFlyers(item).map((flyer) => publicFlyer(flyer)),
  }
}

function githubHeaders(extra = {}) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'digital-transformation',
    ...extra,
  }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  return headers
}

async function github(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: githubHeaders({ 'Content-Type': 'application/json', ...options.headers }),
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) {
    const message = data?.message || response.statusText
    if (response.status === 401 || message === 'Bad credentials') {
      throw new Error('GitHub token is missing or invalid. Add GITHUB_TOKEN in Vercel Environment Variables, then redeploy.')
    }
    throw new Error(message)
  }
  return data
}

async function createGitBlob(buffer) {
  const blob = await github(`/repos/${REPO}/git/blobs`, {
    method: 'POST',
    body: JSON.stringify({ content: Buffer.from(buffer).toString('base64'), encoding: 'base64' }),
  })
  return blob.sha
}

async function githubBlobRaw(sha) {
  const response = await fetch(`https://api.github.com/repos/${REPO}/git/blobs/${sha}`, {
    headers: githubHeaders({ Accept: 'application/vnd.github.raw' }),
  })
  if (!response.ok) throw new Error('Could not read the uploaded flyer.')
  return Buffer.from(await response.arrayBuffer())
}

async function readCatalog() {
  const file = await github(`/repos/${REPO}/contents/src/data/solutions.json?ref=${BRANCH}`)
  const json = Buffer.from(file.content, 'base64').toString('utf8')
  return normalize(JSON.parse(json))
}

async function commit(files, message) {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('Add a GITHUB_TOKEN in the Vercel project settings, then redeploy.')
  }
  const ref = await github(`/repos/${REPO}/git/ref/heads/${BRANCH}`)
  const parent = ref.object.sha
  const current = await github(`/repos/${REPO}/git/commits/${parent}`)
  const tree = []
  for (const file of files) {
    if (file.deleted) {
      tree.push({ path: file.path, mode: '100644', type: 'blob', sha: null })
      continue
    }
    const content = Buffer.isBuffer(file.content) ? file.content.toString('base64') : Buffer.from(file.content).toString('base64')
    const blob = await github(`/repos/${REPO}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content, encoding: 'base64' }),
    })
    tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha })
  }
  const nextTree = await github(`/repos/${REPO}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: current.tree.sha, tree }),
  })
  const nextCommit = await github(`/repos/${REPO}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message, tree: nextTree.sha, parents: [parent] }),
  })
  await github(`/repos/${REPO}/git/refs/heads/${BRANCH}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: nextCommit.sha }),
  })
}

function catalogFiles(catalog) {
  return [
    { path: 'src/data/solutions.json', content: JSON.stringify(catalog, null, 2) },
    { path: 'src/data/solutions.js', content: buildSource(catalog) },
  ]
}

function applySave(catalog, payload) {
  if (!payload.id || !payload.title?.trim() || !payload.text?.trim()) {
    return { error: 'Name and description are required.' }
  }
  const items = catalog.solutions
  const existing = items.find((item) => item.id === payload.id)
  let image = existing?.image || ''
  let imageFile = null
  let removePath = ''
  if (payload.imageBase64) {
    const match = String(payload.imageBase64).match(/^data:image\/(\w+);base64,(.+)$/)
    if (!match) return { error: 'Image could not be saved.' }
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1].toLowerCase()
    const nextImage = `solutions/${safeId(payload.id)}.${ext}`
    if (image.startsWith('solutions/') && image !== nextImage) removePath = `src/assets/${image}`
    image = nextImage
    imageFile = { path: `src/assets/${nextImage}`, content: Buffer.from(match[2], 'base64') }
  }
  const nextItem = {
    id: payload.id,
    title: payload.title.trim(),
    text: payload.text.trim(),
    category: String(payload.category || existing?.category || '').trim(),
    url: String(payload.url || '').trim(),
    image,
    flyers: listFlyers(existing),
  }
  const next = {
    ...catalog,
    solutions: existing ? items.map((item) => (item.id === payload.id ? nextItem : item)) : [...items, nextItem],
  }
  const files = catalogFiles(next)
  if (imageFile) files.push(imageFile)
  if (removePath) files.push({ path: removePath, deleted: true })
  return { nextItem, files, imageOverride: payload.imageBase64 || '' }
}

function publicCustomerImage(image) {
  if (!image) return ''
  const normalized = String(image).replaceAll('\\', '/')
  if (normalized.startsWith('http') || normalized.startsWith('data:') || normalized.startsWith('/')) return normalized
  return `https://raw.githubusercontent.com/${REPO}/${BRANCH}/public/${normalized}`
}

function toPublicCustomer(item, imageOverride) {
  return {
    id: item.id,
    name: item.name,
    image: imageOverride || publicCustomerImage(item.image),
  }
}

function publicCatalog(catalog) {
  return {
    categories: catalog.categories,
    solutions: catalog.solutions.map((item) => toPublic(item)),
    customers: (catalog.customers || []).map((item) => toPublicCustomer(item)),
  }
}

export async function listSolutions() {
  return publicCatalog(await readCatalog())
}

export async function saveSolution(payload) {
  const catalog = await readCatalog()
  const result = applySave(catalog, payload)
  if (result.error) return { status: 400, body: { error: result.error } }
  await commit(result.files, `Update solution ${result.nextItem.title}`)
  return { status: 200, body: toPublic(result.nextItem, result.imageOverride) }
}

export async function deleteSolution(id) {
  const catalog = await readCatalog()
  const item = catalog.solutions.find((entry) => entry.id === id)
  if (!item) return { status: 404, body: { error: 'Not found.' } }
  const next = {
    ...catalog,
    solutions: catalog.solutions.filter((entry) => entry.id !== id),
  }
  const files = catalogFiles(next)
  if (item.image?.startsWith('solutions/')) files.push({ path: `src/assets/${item.image}`, deleted: true })
  for (const flyer of listFlyers(item)) {
    files.push({ path: `public/flyers/${flyer.file}`, deleted: true })
  }
  await commit(files, `Remove solution ${item.title}`)
  return { status: 200, body: { ok: true } }
}

export async function saveFlyer(solutionId, payload, flyerId = '') {
  const catalog = await readCatalog()
  const item = catalog.solutions.find((entry) => entry.id === solutionId)
  if (!item) return { status: 404, body: { error: 'Solution not found.' } }
  let buffer = Buffer.isBuffer(payload.buffer) ? payload.buffer : null
  let mime = payload.mime || ''
  if (!buffer) {
    const parsed = parseDataFile(payload.fileBase64)
    if (!parsed) return { status: 400, body: { error: 'File could not be saved.' } }
    buffer = parsed.buffer
    mime = parsed.mime || mime
  }
  if (buffer.length > MAX_FLYER_BYTES) {
    return { status: 400, body: { error: flyerSizeError() } }
  }
  const name = flyerName(payload.name)
  const ext = flyerExt(name, mime)
  if (!ext) return { status: 400, body: { error: 'Use an image, PDF, Word, Excel, or PowerPoint file.' } }
  const flyers = listFlyers(item)
  const existing = flyerId ? flyers.find((flyer) => flyer.id === flyerId) : null
  const id = existing?.id || String(payload.id || '').trim() || randomUUID()
  const file = `${safeId(solutionId)}/${safeId(id)}.${ext}`
  const nextFlyer = { id, name, file, type: FLYER_TYPES[ext] }
  const nextFlyers = existing
    ? flyers.map((flyer) => (flyer.id === id ? nextFlyer : flyer))
    : [...flyers, nextFlyer]
  const next = {
    ...catalog,
    solutions: catalog.solutions.map((entry) => (entry.id === solutionId ? { ...entry, flyers: nextFlyers } : entry)),
  }
  const files = catalogFiles(next)
  files.push({ path: `public/flyers/${file}`, content: buffer })
  if (existing?.file && existing.file !== file) {
    files.push({ path: `public/flyers/${existing.file}`, deleted: true })
  }
  await commit(files, existing ? `Replace flyer ${name}` : `Add flyer ${name}`)
  return { status: 200, body: publicFlyer(nextFlyer) }
}

export async function saveFlyerUpload(solutionId, req, flyerId = '') {
  const meta = flyerUploadMeta(req)
  const chunk = await readRawBody(req, FLYER_CHUNK_BYTES + 1024 * 64)
  if (meta.index + 1 < meta.count) {
    const sha = await createGitBlob(chunk)
    return { status: 200, body: { pending: true, sha } }
  }
  const parts = []
  for (const sha of meta.shas) parts.push(await githubBlobRaw(sha))
  parts.push(chunk)
  return saveFlyer(
    solutionId,
    { buffer: Buffer.concat(parts), name: meta.name, mime: meta.mime, id: meta.id },
    flyerId,
  )
}

export async function deleteFlyer(solutionId, flyerId) {
  const catalog = await readCatalog()
  const item = catalog.solutions.find((entry) => entry.id === solutionId)
  if (!item) return { status: 404, body: { error: 'Solution not found.' } }
  const flyer = listFlyers(item).find((entry) => entry.id === flyerId)
  if (!flyer) return { status: 404, body: { error: 'Flyer not found.' } }
  const next = {
    ...catalog,
    solutions: catalog.solutions.map((entry) =>
      entry.id === solutionId ? { ...entry, flyers: listFlyers(entry).filter((entryFlyer) => entryFlyer.id !== flyerId) } : entry,
    ),
  }
  const files = catalogFiles(next)
  files.push({ path: `public/flyers/${flyer.file}`, deleted: true })
  await commit(files, `Remove flyer ${flyer.name}`)
  return { status: 200, body: { ok: true } }
}

export async function saveCategory(payload) {
  const name = String(payload.name || '').trim()
  if (!name) return { status: 400, body: { error: 'Category name is required.' } }
  const catalog = await readCatalog()
  const id = String(payload.id || '').trim() || safeId(name).toLowerCase()
  const existing = catalog.categories.find((category) => category.id === id)
  const nextCategory = { id, name, text: String(payload.text || existing?.text || '').trim() }
  const categories = existing
    ? catalog.categories.map((category) => (category.id === id ? nextCategory : category))
    : [...catalog.categories, nextCategory]
  await commit(catalogFiles({ ...catalog, categories }), `Update category ${name}`)
  return { status: 200, body: nextCategory }
}

export async function saveCustomer(payload) {
  const name = String(payload.name || '').trim()
  if (!name) return { status: 400, body: { error: 'Customer name is required.' } }
  const catalog = await readCatalog()
  let id = String(payload.id || '').trim() || safeId(name).toLowerCase()
  if (!payload.id && catalog.customers.some((customer) => customer.id === id)) {
    id = `${id}_${randomUUID().slice(0, 8)}`
  }
  const current = catalog.customers.find((customer) => customer.id === id)
  let image = current?.image || ''
  const files = []
  if (payload.imageBase64) {
    const parsed = parseDataFile(payload.imageBase64)
    if (!parsed) return { status: 400, body: { error: 'Logo could not be saved.' } }
    if (parsed.buffer.length > MAX_LOGO_BYTES) {
      return { status: 400, body: { error: 'Logo is too large. Use a file under 2 MB.' } }
    }
    const ext = logoExt(payload.fileName || name, parsed.mime)
    if (!ext) return { status: 400, body: { error: 'Use a PNG, JPG, WebP, GIF, or SVG logo.' } }
    const nextImage = `customers/${safeId(id)}.${ext}`
    files.push({ path: `public/${nextImage}`, content: parsed.buffer })
    if (image && image !== nextImage && !DEFAULT_CUSTOMERS.some((customer) => customer.image === image)) {
      files.push({ path: `public/${image}`, deleted: true })
    }
    image = nextImage
  }
  if (!image) return { status: 400, body: { error: 'Upload a logo image.' } }
  const nextCustomer = { id, name, image }
  const customers = current
    ? catalog.customers.map((customer) => (customer.id === id ? nextCustomer : customer))
    : [...catalog.customers, nextCustomer]
  const next = { ...catalog, customers }
  await commit([...catalogFiles(next), ...files], `Update customer ${name}`)
  return { status: 200, body: toPublicCustomer(nextCustomer, payload.imageBase64 || '') }
}

export async function deleteCustomer(id) {
  const catalog = await readCatalog()
  const customer = catalog.customers.find((entry) => entry.id === id)
  if (!customer) return { status: 404, body: { error: 'Logo not found.' } }
  const next = { ...catalog, customers: catalog.customers.filter((entry) => entry.id !== id) }
  const files = catalogFiles(next)
  if (customer.image && !DEFAULT_CUSTOMERS.some((entry) => entry.image === customer.image)) {
    files.push({ path: `public/${customer.image}`, deleted: true })
  }
  await commit(files, `Remove customer ${customer.name}`)
  return { status: 200, body: { ok: true } }
}

export async function deleteCategory(id) {
  const catalog = await readCatalog()
  const category = catalog.categories.find((entry) => entry.id === id)
  if (!category) return { status: 404, body: { error: 'Category not found.' } }
  const next = {
    ...catalog,
    categories: catalog.categories.filter((entry) => entry.id !== id),
    solutions: catalog.solutions.map((item) => (item.category === id ? { ...item, category: '' } : item)),
  }
  await commit(catalogFiles(next), `Remove category ${category.name}`)
  return { status: 200, body: { ok: true } }
}

const CREDENTIALS_PATH = 'server/credentials.json'

export async function readAdminCredentials() {
  try {
    const file = await github(`/repos/${REPO}/contents/${CREDENTIALS_PATH}?ref=${BRANCH}`)
    const json = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'))
    const employeeId = String(json?.employeeId || '').trim()
    const passwordHash = String(json?.passwordHash || '').trim()
    if (!employeeId || !passwordHash) return null
    return { employeeId, passwordHash }
  } catch {
    return null
  }
}

export async function saveAdminCredentials(record) {
  const employeeId = String(record?.employeeId || '').trim()
  const passwordHash = String(record?.passwordHash || '').trim()
  if (!employeeId || !passwordHash) {
    throw new Error('Employee login could not be saved.')
  }
  await commit(
    [{ path: CREDENTIALS_PATH, content: `${JSON.stringify({ employeeId, passwordHash }, null, 2)}\n` }],
    'Update employee login',
  )
}
