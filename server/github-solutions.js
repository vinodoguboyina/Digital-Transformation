const REPO = 'vinodoguboyina/Digital-Transformation'
const BRANCH = 'main'

function safeId(id) {
  return String(id).replace(/[^a-zA-Z0-9_]/g, '_')
}

function buildSource(items) {
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
    url: ${JSON.stringify(item.url || '')},
    image: ${item.image ? `img_${safeId(item.id)}` : '""'},
  }`,
    )
    .join(',\n')
  const list = body ? `\n${body},\n` : '\n'
  return `${imports}\n\nexport const solutions = [${list}]\n\nif (import.meta.hot) {\n  import.meta.hot.accept()\n}\n`
}

function publicImage(image) {
  if (!image) return ''
  const normalized = image.replaceAll('\\', '/')
  return `https://raw.githubusercontent.com/${REPO}/${BRANCH}/src/assets/${normalized}`
}

function toPublic(item, imageOverride) {
  return {
    id: item.id,
    title: item.title,
    text: item.text,
    url: item.url || '',
    image: imageOverride || publicImage(item.image),
  }
}

async function github(path, options = {}) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': 'digital-transformation',
  }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  const response = await fetch(`https://api.github.com${path}`, { ...options, headers })
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) {
    const message = data?.message || response.statusText
    throw new Error(message)
  }
  return data
}

async function readItems() {
  const file = await github(`/repos/${REPO}/contents/src/data/solutions.json?ref=${BRANCH}`)
  const json = Buffer.from(file.content, 'base64').toString('utf8')
  const items = JSON.parse(json)
  return Array.isArray(items) ? items : []
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

function catalogFiles(items) {
  return [
    { path: 'src/data/solutions.json', content: JSON.stringify(items, null, 2) },
    { path: 'src/data/solutions.js', content: buildSource(items) },
  ]
}

function applySave(items, payload) {
  if (!payload.id || !payload.title?.trim() || !payload.text?.trim()) {
    return { error: 'Name and description are required.' }
  }
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
    url: String(payload.url || '').trim(),
    image,
  }
  const next = existing ? items.map((item) => (item.id === payload.id ? nextItem : item)) : [...items, nextItem]
  const files = catalogFiles(next)
  if (imageFile) files.push(imageFile)
  if (removePath) files.push({ path: removePath, deleted: true })
  return { nextItem, files, imageOverride: payload.imageBase64 || '' }
}

export async function listSolutions() {
  const items = await readItems()
  return items.map((item) => toPublic(item))
}

export async function saveSolution(payload) {
  const items = await readItems()
  const result = applySave(items, payload)
  if (result.error) return { status: 400, body: { error: result.error } }
  await commit(result.files, `Update solution ${result.nextItem.title}`)
  return { status: 200, body: toPublic(result.nextItem, result.imageOverride) }
}

export async function deleteSolution(id) {
  const items = await readItems()
  const item = items.find((entry) => entry.id === id)
  if (!item) return { status: 404, body: { error: 'Not found.' } }
  const next = items.filter((entry) => entry.id !== id)
  const files = catalogFiles(next)
  if (item.image?.startsWith('solutions/')) files.push({ path: `src/assets/${item.image}`, deleted: true })
  await commit(files, `Remove solution ${item.title}`)
  return { status: 200, body: { ok: true } }
}
