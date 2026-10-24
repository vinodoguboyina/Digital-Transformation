import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { changeAccount, loginAdmin, logoutCookie, noStore, readAdmin, setCookies, unauthorized } from './server/auth.js'
import { DEFAULT_CUSTOMERS, MAX_LOGO_BYTES, logoExt, withCustomers } from './server/customers.js'
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
  safeFlyerFile,
} from './server/flyers.js'

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
  const flyersDir = path.join(root, 'public', 'flyers')
  const customersDir = path.join(root, 'public', 'customers')
  const jsonPath = path.join(root, 'src', 'data', 'solutions.json')
  const codePath = path.join(root, 'src', 'data', 'solutions.js')
  const flyerUploads = new Map()

  function writeCode(catalog) {
    let customers = catalog.customers
    if (!Array.isArray(customers) && fs.existsSync(jsonPath)) {
      try {
        customers = withCustomers(JSON.parse(fs.readFileSync(jsonPath, 'utf8'))).customers
      } catch {
        customers = DEFAULT_CUSTOMERS
      }
    }
    if (!Array.isArray(customers)) customers = DEFAULT_CUSTOMERS
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
    const publicCustomers = customers.map((customer) => ({
      ...customer,
      image: customer.image ? `/${String(customer.image).replaceAll('\\', '/').replace(/^\//, '')}` : '',
    }))
    const next = { categories: catalog.categories || [], solutions: catalog.solutions || [], customers }
    const source = `${imports}\n\nexport const categories = ${JSON.stringify(next.categories, null, 2)}\n\nexport const solutions = [${list}]\n\nexport const customers = ${JSON.stringify(publicCustomers, null, 2)}\n\nif (import.meta.hot) {\n  import.meta.hot.accept()\n}\n`
    fs.writeFileSync(codePath, source)
    fs.writeFileSync(jsonPath, JSON.stringify(next, null, 2))
  }

  function ensure() {
    fs.mkdirSync(uploadDir, { recursive: true })
    fs.mkdirSync(flyersDir, { recursive: true })
    fs.mkdirSync(customersDir, { recursive: true })
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true })
    if (fs.existsSync(jsonPath)) return
    writeCode({
      categories: [],
      solutions: seeds.map(([id, image, title, text]) => ({ id, title, text, image, url: '', category: '', flyers: [] })),
      customers: DEFAULT_CUSTOMERS,
    })
  }

  function readCatalog() {
    ensure()
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    const catalog = withCustomers(raw)
    if (!Array.isArray(raw.customers)) writeCode(catalog)
    return catalog
  }

  function toPublicCustomer(item) {
    const image = String(item.image || '').replaceAll('\\', '/')
    if (!image) return { id: item.id, name: item.name, image: '' }
    if (image.startsWith('data:') || image.startsWith('http') || image.startsWith('/')) {
      return { id: item.id, name: item.name, image }
    }
    return { id: item.id, name: item.name, image: `/${image}` }
  }

  function logoPath(file) {
    const normalized = String(file || '').replaceAll('\\', '/')
    if (!normalized.startsWith('customers/')) return ''
    const dest = path.normalize(path.join(root, 'public', ...normalized.split('/')))
    if (!dest.startsWith(path.normalize(customersDir))) return ''
    return dest
  }

  function removeLogo(image) {
    const normalized = String(image || '').replaceAll('\\', '/')
    if (DEFAULT_CUSTOMERS.some((customer) => customer.image === normalized)) return
    const dest = logoPath(image)
    if (dest && fs.existsSync(dest)) fs.unlinkSync(dest)
  }

  function toPublic(item) {
    const flyers = listFlyers(item).map((flyer) => ({
      ...flyer,
      url: `/flyers/${String(flyer.file || '').replaceAll('\\', '/')}`,
    }))
    if (!item.image) return { ...item, image: '', flyers }
    return { ...item, image: `/src/assets/${item.image.replaceAll('\\', '/')}`, flyers }
  }

  function flyerPath(file) {
    const normalized = String(file || '').replaceAll('\\', '/')
    const dest = path.join(flyersDir, normalized)
    if (!dest.startsWith(flyersDir)) return ''
    return dest
  }

  function removeFlyerFile(file) {
    const dest = flyerPath(file)
    if (dest && fs.existsSync(dest)) fs.unlinkSync(dest)
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

      if (url === '/api/flyers' && req.method === 'GET') {
        const file = safeFlyerFile(new URL(req.url, 'http://localhost').searchParams.get('file'))
        const dest = flyerPath(file)
        if (!dest || !fs.existsSync(dest)) {
          sendJson(res, 404, { error: 'Flyer not found.' })
          return
        }
        const ext = flyerExt(file)
        res.statusCode = 200
        res.setHeader('Content-Type', FLYER_TYPES[ext] || 'application/octet-stream')
        res.setHeader('Content-Disposition', `inline; filename="${path.basename(dest)}"`)
        fs.createReadStream(dest).pipe(res)
        return
      }

      if (url === '/api/auth/me' && req.method === 'GET') {
        noStore(res)
        const admin = readAdmin(req)
        sendJson(res, 200, { employeeId: admin?.employeeId || null })
        return
      }

      if (url === '/api/auth/login' && req.method === 'POST') {
        noStore(res)
        const payload = JSON.parse((await readBody(req)).toString() || '{}')
        const result = await loginAdmin(payload.employeeId, payload.password, req)
        if (result.cookie) setCookies(res, result.cookie)
        sendJson(res, result.status, result.body)
        return
      }

      if (url === '/api/auth/logout' && req.method === 'POST') {
        noStore(res)
        setCookies(res, logoutCookie())
        sendJson(res, 200, { ok: true })
        return
      }

      if (url === '/api/auth/account' && req.method === 'POST') {
        noStore(res)
        const admin = readAdmin(req)
        if (!admin) {
          sendJson(res, 401, unauthorized)
          return
        }
        try {
          const payload = JSON.parse((await readBody(req)).toString() || '{}')
          const result = await changeAccount(admin.employeeId, payload)
          if (result.cookie) setCookies(res, result.cookie)
          sendJson(res, result.status, result.body)
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Could not update the employee login.' })
        }
        return
      }

      const needAdmin = () => {
        if (readAdmin(req)) return true
        sendJson(res, 401, unauthorized)
        return false
      }

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

      if (url === '/api/categories' && req.method === 'POST') {
        if (!needAdmin()) return
        const payload = JSON.parse((await readBody(req)).toString() || '{}')
        const name = String(payload.name || '').trim()
        if (!name) {
          sendJson(res, 400, { error: 'Category name is required.' })
          return
        }
        const catalog = readCatalog()
        const id = String(payload.id || '').trim() || safeId(name).toLowerCase()
        const existing = catalog.categories.find((category) => category.id === id)
        const nextCategory = { id, name, text: String(payload.text || existing?.text || '').trim() }
        const categories = existing
          ? catalog.categories.map((category) => (category.id === id ? nextCategory : category))
          : [...catalog.categories, nextCategory]
        writeCode({ ...catalog, categories })
        sendJson(res, 200, nextCategory)
        return
      }

      if (url.startsWith('/api/categories/') && req.method === 'DELETE') {
        if (!needAdmin()) return
        const id = decodeURIComponent(url.slice('/api/categories/'.length))
        const catalog = readCatalog()
        const category = catalog.categories.find((entry) => entry.id === id)
        if (!category) {
          sendJson(res, 404, { error: 'Category not found.' })
          return
        }
        writeCode({
          categories: catalog.categories.filter((entry) => entry.id !== id),
          solutions: catalog.solutions.map((item) => (item.category === id ? { ...item, category: '' } : item)),
        })
        sendJson(res, 200, { ok: true })
        return
      }

      if (url === '/api/solutions' && req.method === 'GET') {
        const catalog = readCatalog()
        sendJson(res, 200, {
          categories: catalog.categories,
          solutions: catalog.solutions.map(toPublic),
          customers: catalog.customers.map(toPublicCustomer),
        })
        return
      }

      if (url === '/api/customers' && req.method === 'POST') {
        if (!needAdmin()) return
        const payload = JSON.parse((await readBody(req)).toString() || '{}')
        const name = String(payload.name || '').trim()
        if (!name) {
          sendJson(res, 400, { error: 'Customer name is required.' })
          return
        }
        const catalog = readCatalog()
        let id = String(payload.id || '').trim() || safeId(name).toLowerCase()
        const existing = catalog.customers.find((customer) => customer.id === id)
        if (!payload.id && existing) id = `${id}_${randomUUID().slice(0, 8)}`
        const current = catalog.customers.find((customer) => customer.id === id)
        let image = current?.image || ''
        if (payload.imageBase64) {
          const parsed = parseDataFile(payload.imageBase64)
          if (!parsed) {
            sendJson(res, 400, { error: 'Logo could not be saved.' })
            return
          }
          if (parsed.buffer.length > MAX_LOGO_BYTES) {
            sendJson(res, 400, { error: 'Logo is too large. Use a file under 2 MB.' })
            return
          }
          const ext = logoExt(payload.fileName || name, parsed.mime)
          if (!ext) {
            sendJson(res, 400, { error: 'Use a PNG, JPG, WebP, GIF, or SVG logo.' })
            return
          }
          const nextImage = `customers/${safeId(id)}.${ext}`
          const dest = logoPath(nextImage)
          fs.mkdirSync(customersDir, { recursive: true })
          fs.writeFileSync(dest, parsed.buffer)
          if (image && image !== nextImage) removeLogo(image)
          image = nextImage
        }
        if (!image) {
          sendJson(res, 400, { error: 'Upload a logo image.' })
          return
        }
        const nextCustomer = { id, name, image }
        const customers = current
          ? catalog.customers.map((customer) => (customer.id === id ? nextCustomer : customer))
          : [...catalog.customers, nextCustomer]
        writeCode({ ...catalog, customers })
        sendJson(res, 200, { ...toPublicCustomer(nextCustomer), image: payload.imageBase64 || toPublicCustomer(nextCustomer).image })
        return
      }

      if (url.startsWith('/api/customers/') && req.method === 'DELETE') {
        if (!needAdmin()) return
        const id = decodeURIComponent(url.slice('/api/customers/'.length))
        const catalog = readCatalog()
        const customer = catalog.customers.find((entry) => entry.id === id)
        if (!customer) {
          sendJson(res, 404, { error: 'Logo not found.' })
          return
        }
        removeLogo(customer.image)
        writeCode({ ...catalog, customers: catalog.customers.filter((entry) => entry.id !== id) })
        sendJson(res, 200, { ok: true })
        return
      }

      if (url === '/api/solutions' && req.method === 'POST') {
        if (!needAdmin()) return
        const payload = JSON.parse((await readBody(req)).toString() || '{}')
        if (!payload.id || !payload.title?.trim() || !payload.text?.trim()) {
          sendJson(res, 400, { error: 'Name and description are required.' })
          return
        }
        const catalog = readCatalog()
        const items = catalog.solutions
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
          category: String(payload.category || existing?.category || '').trim(),
          url: String(payload.url || '').trim(),
          image: image || '',
          flyers: listFlyers(existing),
        }
        const next = existing
          ? items.map((item) => (item.id === payload.id ? nextItem : item))
          : [...items, nextItem]
        writeCode({ categories: catalog.categories, solutions: next })
        sendJson(res, 200, toPublic(nextItem))
        return
      }

      const flyerMatch = url.match(/^\/api\/solutions\/([^/]+)\/flyers(?:\/([^/]+))?$/)
      if (flyerMatch && (req.method === 'POST' || req.method === 'PUT')) {
        if (!needAdmin()) return
        const solutionId = decodeURIComponent(flyerMatch[1])
        const flyerId = flyerMatch[2] ? decodeURIComponent(flyerMatch[2]) : ''
        const meta = flyerUploadMeta(req)
        let chunk
        try {
          chunk = await readRawBody(req, FLYER_CHUNK_BYTES + 1024 * 64)
        } catch (error) {
          sendJson(res, 400, { error: error.message || flyerSizeError() })
          return
        }
        const key = meta.uploadId || randomUUID()
        const entry = flyerUploads.get(key) || { parts: Array.from({ length: meta.count }) }
        if (entry.parts.length !== meta.count) entry.parts = Array.from({ length: meta.count })
        entry.parts[meta.index] = chunk
        flyerUploads.set(key, entry)
        if (entry.parts.some((part) => part === undefined)) {
          sendJson(res, 200, { pending: true })
          return
        }
        flyerUploads.delete(key)
        const buffer = Buffer.concat(entry.parts)
        const catalog = readCatalog()
        const item = catalog.solutions.find((entry) => entry.id === solutionId)
        if (!item) {
          sendJson(res, 404, { error: 'Solution not found.' })
          return
        }
        if (buffer.length > MAX_FLYER_BYTES) {
          sendJson(res, 400, { error: flyerSizeError() })
          return
        }
        const name = flyerName(meta.name)
        const ext = flyerExt(name, meta.mime)
        if (!ext) {
          sendJson(res, 400, { error: 'Use an image, PDF, Word, Excel, or PowerPoint file.' })
          return
        }
        const flyers = listFlyers(item)
        const existingFlyer = flyerId ? flyers.find((flyer) => flyer.id === flyerId) : null
        const id = existingFlyer?.id || meta.id || randomUUID()
        const file = `${safeId(solutionId)}/${safeId(id)}.${ext}`
        const dest = flyerPath(file)
        fs.mkdirSync(path.dirname(dest), { recursive: true })
        fs.writeFileSync(dest, buffer)
        if (existingFlyer?.file && existingFlyer.file !== file) removeFlyerFile(existingFlyer.file)
        const nextFlyer = { id, name, file, type: FLYER_TYPES[ext] }
        const nextFlyers = existingFlyer
          ? flyers.map((flyer) => (flyer.id === id ? nextFlyer : flyer))
          : [...flyers, nextFlyer]
        writeCode({
          categories: catalog.categories,
          solutions: catalog.solutions.map((entry) => (entry.id === solutionId ? { ...entry, flyers: nextFlyers } : entry)),
        })
        sendJson(res, 200, { ...nextFlyer, url: `/flyers/${file}` })
        return
      }

      if (flyerMatch && req.method === 'DELETE' && flyerMatch[2]) {
        if (!needAdmin()) return
        const solutionId = decodeURIComponent(flyerMatch[1])
        const flyerId = decodeURIComponent(flyerMatch[2])
        const catalog = readCatalog()
        const item = catalog.solutions.find((entry) => entry.id === solutionId)
        const flyer = item ? listFlyers(item).find((entry) => entry.id === flyerId) : null
        if (!item || !flyer) {
          sendJson(res, 404, { error: 'Flyer not found.' })
          return
        }
        removeFlyerFile(flyer.file)
        writeCode({
          categories: catalog.categories,
          solutions: catalog.solutions.map((entry) =>
            entry.id === solutionId ? { ...entry, flyers: listFlyers(entry).filter((entryFlyer) => entryFlyer.id !== flyerId) } : entry,
          ),
        })
        sendJson(res, 200, { ok: true })
        return
      }

      if (url.startsWith('/api/solutions/') && req.method === 'DELETE') {
        if (!needAdmin()) return
        const id = decodeURIComponent(url.slice('/api/solutions/'.length))
        const catalog = readCatalog()
        const item = catalog.solutions.find((entry) => entry.id === id)
        if (!item) {
          sendJson(res, 404, { error: 'Not found.' })
          return
        }
        removeUploaded(item.image)
        for (const flyer of listFlyers(item)) removeFlyerFile(flyer.file)
        const solutionFlyers = path.join(flyersDir, safeId(id))
        if (solutionFlyers.startsWith(flyersDir) && fs.existsSync(solutionFlyers)) {
          fs.rmSync(solutionFlyers, { recursive: true, force: true })
        }
        writeCode({
          categories: catalog.categories,
          solutions: catalog.solutions.filter((entry) => entry.id !== id),
        })
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
