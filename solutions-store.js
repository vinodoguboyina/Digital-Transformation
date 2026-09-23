import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const seeds = [
  ['quality', 'products/screen-quality.png', 'Quality Status – INDi4.0 Basic', 'Watch production quality while the job is running. Live dashboards show defects so the team can report and correct them before the batch moves on.'],
  ['spc', 'products/screen-spc.png', 'Quality Status – INDi4.0 Basic + SPC', 'Add statistical process control to live quality checks. See process capability and quality trends, and catch drift before it becomes scrap.'],
  ['tools', 'products/screen-tools.png', 'Tool Room Inventory Management (Smart_IvT)', 'Track every tool from the store to the machine. Record issue and return, and watch remaining tool life so a worn tool is replaced on time.'],
  ['gauges', 'products/screen-gauges.png', 'Gauge Management Software', 'Keep each gauge calibrated and accounted for. Store its history, see where it is, and get an alert before the calibration date is missed.'],
  ['lab', 'products/screen-lab.png', 'Digitisation of Testing Labs', 'Replace paper lab books with digital test records. The lab follows one workflow, and the test report is generated from the same entry.'],
  ['orders', 'products/screen-orders.png', 'Order Management App for Top Management', 'Give leadership a live view of orders and deliveries. One dashboard shows business performance without waiting for a compiled report.'],
  ['viewer', 'products/screen-3d.png', '3D Viewer', 'Open CAD models in the browser. Engineers review the part together without installing a separate viewer on every machine.'],
  ['jobcard', 'products/screen-jobcard.png', 'Digitisation of Job Cards', 'Take job cards off paper. The shop floor updates the card as the job moves, so production status is visible as the shift runs.'],
  ['projects', 'products/screen-projects.png', 'Project Management App (ClickUp-Based)', 'Plan the project, assign each task, and keep the team working from the same board. Built on ClickUp so planning stays with the work.'],
  ['indiq', 'products/screen-indiq.png', 'INDIQ 4.0 – AI Manufacturing Intelligence', 'Digitize drawings, extract characteristics with AI, and connect machines over IoT. Quality data feeds back into the process so the loop stays closed.'],
]

function safeId(id) {
  return String(id).replace(/[^a-zA-Z0-9_]/g, '_')
}

function openInBrowser(target) {
  const parsed = new URL(target)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only web links can be opened.')
  }
  const href = parsed.toString()
  if (process.platform === 'win32') {
    execFile('rundll32', ['url.dll,FileProtocolHandler', href])
    return
  }
  if (process.platform === 'darwin') {
    execFile('open', [href])
    return
  }
  execFile('xdg-open', [href])
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export function solutionsStorePlugin(root) {
  const assetsDir = path.join(root, 'src', 'assets')
  const uploadDir = path.join(assetsDir, 'solutions')
  const jsonPath = path.join(root, 'src', 'data', 'solutions.json')
  const codePath = path.join(root, 'src', 'data', 'solutions.js')

  function writeCode(items) {
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
    const source = `${imports}\n\nexport const solutions = [${list}]\n\nif (import.meta.hot) {\n  import.meta.hot.accept()\n}\n`
    fs.writeFileSync(codePath, source)
    fs.writeFileSync(jsonPath, JSON.stringify(items, null, 2))
  }

  function ensure() {
    fs.mkdirSync(uploadDir, { recursive: true })
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true })
    if (fs.existsSync(jsonPath)) return
    writeCode(seeds.map(([id, image, title, text]) => ({ id, title, text, image, url: '' })))
  }

  function readItems() {
    ensure()
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  }

  function toPublic(item) {
    if (!item.image) return { ...item, image: '' }
    return { ...item, image: `/src/assets/${item.image.replaceAll('\\', '/')}` }
  }

  function removeUploaded(image) {
    if (!image) return
    const normalized = image.replaceAll('\\', '/')
    if (!normalized.startsWith('solutions/')) return
    const file = path.join(assetsDir, normalized)
    if (file.startsWith(uploadDir) && fs.existsSync(file)) fs.unlinkSync(file)
  }

  function sendJson(res, status, body) {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(body))
  }

  function attach(server) {
    ensure()
    server.middlewares.use(async (req, res, next) => {
      const url = (req.url || '').split('?')[0]

      if (url === '/api/open-demo' && req.method === 'POST') {
        const payload = JSON.parse((await readBody(req)).toString() || '{}')
        try {
          openInBrowser(String(payload.url || ''))
          sendJson(res, 200, { ok: true })
        } catch {
          sendJson(res, 400, { error: 'That link could not be opened.' })
        }
        return
      }

      if (url === '/api/solutions' && req.method === 'GET') {
        sendJson(res, 200, readItems().map(toPublic))
        return
      }

      if (url === '/api/solutions' && req.method === 'POST') {
        const payload = JSON.parse((await readBody(req)).toString() || '{}')
        if (!payload.id || !payload.title?.trim() || !payload.text?.trim()) {
          sendJson(res, 400, { error: 'Name and description are required.' })
          return
        }
        const items = readItems()
        const existing = items.find((item) => item.id === payload.id)
        let image = existing?.image || ''
        if (payload.imageBase64) {
          const match = String(payload.imageBase64).match(/^data:image\/(\w+);base64,(.+)$/)
          if (!match) {
            sendJson(res, 400, { error: 'Image could not be saved.' })
            return
          }
          const ext = match[1] === 'jpeg' ? 'jpg' : match[1]
          if (image) removeUploaded(image)
          image = `solutions/${safeId(payload.id)}.${ext}`
          fs.writeFileSync(path.join(assetsDir, image), Buffer.from(match[2], 'base64'))
        }
        const nextItem = {
          id: payload.id,
          title: payload.title.trim(),
          text: payload.text.trim(),
          url: String(payload.url || '').trim(),
          image: image || '',
        }
        const next = existing
          ? items.map((item) => (item.id === payload.id ? nextItem : item))
          : [...items, nextItem]
        writeCode(next)
        sendJson(res, 200, toPublic(nextItem))
        return
      }

      if (url.startsWith('/api/solutions/') && req.method === 'DELETE') {
        const id = decodeURIComponent(url.slice('/api/solutions/'.length))
        const items = readItems()
        const item = items.find((entry) => entry.id === id)
        if (!item) {
          sendJson(res, 404, { error: 'Not found.' })
          return
        }
        removeUploaded(item.image)
        writeCode(items.filter((entry) => entry.id !== id))
        sendJson(res, 200, { ok: true })
        return
      }

      next()
    })
  }

  return {
    name: 'solutions-store',
    configureServer: attach,
    configurePreviewServer: attach,
  }
}
