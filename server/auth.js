import crypto from 'node:crypto'
import { bootstrapEnv, setMemoryUsers, storedUsers, writeBootstrapEnv, writeFileUsers } from './credentials.js'

const LOCAL_COOKIE = 'dt_session'
const HOST_COOKIE = '__Host-dt_session'
const MAX_AGE = 60 * 60 * 8
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
const KEYLEN = 32
const attempts = new Map()

function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const key = crypto.scryptSync(String(password), salt, KEYLEN, SCRYPT)
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64url')}$${key.toString('base64url')}`
}

function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const N = Number(parts[1])
  const r = Number(parts[2])
  const p = Number(parts[3])
  const salt = Buffer.from(parts[4], 'base64url')
  const expected = Buffer.from(parts[5], 'base64url')
  if (!salt.length || expected.length !== KEYLEN || !Number.isFinite(N)) return false
  const actual = crypto.scryptSync(String(password), salt, expected.length, { N, r, p, maxmem: SCRYPT.maxmem })
  return same(actual, expected)
}

const DUMMY_HASH = hashPassword(crypto.randomBytes(24).toString('hex'))

function envUsers() {
  const env = bootstrapEnv()
  const list = []
  const id = env.ADMIN_EMPLOYEE_ID
  const hash = env.ADMIN_PASSWORD_HASH
  if (id && hash) list.push({ id, hash })
  for (const pair of env.ADMIN_USERS.split(',')) {
    const index = pair.indexOf(':')
    if (index <= 0) continue
    const nextId = pair.slice(0, index).trim()
    const nextHash = pair.slice(index + 1).trim()
    if (nextId && nextHash) list.push({ id: nextId, hash: nextHash })
  }
  return list
}

async function users() {
  const stored = storedUsers()
  if (stored.length) return stored
  if (process.env.VERCEL === '1') {
    try {
      const { readAdminCredentials } = await import('./github-solutions.js')
      const remote = await readAdminCredentials()
      if (remote) {
        const list = [{ id: remote.employeeId, hash: remote.passwordHash }]
        setMemoryUsers(list)
        return list
      }
    } catch {
      // Fall back to bootstrap env users if GitHub is unavailable.
    }
  }
  return envUsers()
}

function normalizeEmployeeId(value) {
  const id = String(value || '').trim()
  if (!/^[A-Za-z0-9._-]{3,32}$/.test(id)) return ''
  return id
}

function secret() {
  return bootstrapEnv().SESSION_SECRET
}

function production() {
  return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
}

function cookieName() {
  return production() ? HOST_COOKIE : LOCAL_COOKIE
}

function b64url(value) {
  return Buffer.from(value).toString('base64url')
}

function sign(payload) {
  const body = b64url(JSON.stringify(payload))
  const mac = crypto.createHmac('sha256', secret()).update(body).digest('base64url')
  return `${body}.${mac}`
}

function same(left, right) {
  const a = Buffer.isBuffer(left) ? left : Buffer.from(String(left))
  const b = Buffer.isBuffer(right) ? right : Buffer.from(String(right))
  const len = Math.max(a.length, b.length, 32)
  const pa = Buffer.alloc(len)
  const pb = Buffer.alloc(len)
  a.copy(pa)
  b.copy(pb)
  return crypto.timingSafeEqual(pa, pb) && a.length === b.length
}

function cookieFlags() {
  const secure = production()
  return `Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE}${secure ? '; Secure' : ''}`
}

export function sessionCookie(employeeId) {
  const token = sign({
    sub: employeeId,
    iat: Date.now(),
    exp: Date.now() + MAX_AGE * 1000,
    jti: crypto.randomBytes(16).toString('hex'),
  })
  return `${cookieName()}=${token}; ${cookieFlags()}`
}

export function logoutCookie() {
  const flags = `Path=/; HttpOnly; SameSite=Strict; Max-Age=0${production() ? '; Secure' : ''}`
  return [`${LOCAL_COOKIE}=; ${flags}`, `${HOST_COOKIE}=; ${flags}`]
}

function readCookie(header, name) {
  if (!header) return ''
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=')
    if (index <= 0) continue
    if (part.slice(0, index).trim() !== name) continue
    return part.slice(index + 1).trim()
  }
  return ''
}

export function readAdmin(req) {
  const key = secret()
  if (key.length < 32) return null
  const token = readCookie(req.headers?.cookie, HOST_COOKIE) || readCookie(req.headers?.cookie, LOCAL_COOKIE)
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, mac] = parts
  const expected = crypto.createHmac('sha256', key).update(body).digest('base64url')
  if (!same(mac, expected)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (!payload?.sub || payload.exp < Date.now() || !payload.jti) return null
    return { employeeId: String(payload.sub) }
  } catch {
    return null
  }
}

function clientKey(req, employeeId) {
  const forwarded = String(req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim()
  const ip = forwarded || req?.socket?.remoteAddress || 'unknown'
  return `${ip}|${employeeId}`
}

function locked(id) {
  const row = attempts.get(id)
  if (!row) return false
  if (row.until && row.until > Date.now()) return true
  if (row.until && row.until <= Date.now()) attempts.delete(id)
  return false
}

function fail(id) {
  const row = attempts.get(id) || { count: 0, until: 0 }
  row.count += 1
  if (row.count >= 5) row.until = Date.now() + 15 * 60 * 1000
  attempts.set(id, row)
}

function pass(id) {
  attempts.delete(id)
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function loginAdmin(employeeId, password, req) {
  await wait(250)
  const list = await users()
  if (secret().length < 32 || list.length === 0) {
    return { status: 500, body: { error: 'Admin login is not configured.' } }
  }
  const id = String(employeeId || '').trim()
  const submitted = String(password || '')
  if (!id || !submitted) {
    return { status: 400, body: { error: 'Employee ID and password are required.' } }
  }
  const lockKey = clientKey(req, id.toUpperCase())
  if (locked(lockKey) || locked(id.toUpperCase())) {
    return { status: 429, body: { error: 'Too many attempts. Try again in a few minutes.' } }
  }
  const user = list.find((entry) => entry.id.toUpperCase() === id.toUpperCase())
  const ok = verifyPassword(submitted, user?.hash || DUMMY_HASH)
  if (!user || !ok) {
    fail(lockKey)
    fail(id.toUpperCase())
    return { status: 401, body: { error: 'Employee ID or password is incorrect.' } }
  }
  pass(lockKey)
  pass(id.toUpperCase())
  return {
    status: 200,
    body: { employeeId: user.id },
    cookie: sessionCookie(user.id),
  }
}

export async function changeAccount(currentId, payload) {
  await wait(250)
  const nextId = normalizeEmployeeId(payload?.employeeId || currentId)
  const nextPassword = String(payload?.password || '')
  if (!nextId) {
    return { status: 400, body: { error: 'Employee ID must be 3–32 letters, numbers, dots, hyphens, or underscores.' } }
  }
  if (nextPassword.length < 8 || nextPassword.length > 128) {
    return { status: 400, body: { error: 'New password must be at least 8 characters.' } }
  }
  if (nextPassword.toLowerCase() === nextId.toLowerCase()) {
    return { status: 400, body: { error: 'Password cannot be the same as the employee ID.' } }
  }
  if (secret().length < 32) {
    return { status: 500, body: { error: 'Admin login is not configured.' } }
  }
  const list = await users()
  const user = list.find((entry) => entry.id.toUpperCase() === String(currentId || '').toUpperCase())
  if (!user) {
    return { status: 401, body: unauthorized }
  }
  const passwordHash = hashPassword(nextPassword)
  const stored = { employeeId: nextId, passwordHash }
  if (process.env.VERCEL === '1') {
    const { saveAdminCredentials } = await import('./github-solutions.js')
    await saveAdminCredentials(stored)
  } else {
    writeFileUsers(nextId, passwordHash)
    writeBootstrapEnv(nextId, passwordHash)
  }
  setMemoryUsers([{ id: nextId, hash: passwordHash }])
  return {
    status: 200,
    body: { employeeId: nextId },
    cookie: sessionCookie(nextId),
  }
}

export function noStore(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('Pragma', 'no-cache')
}

export function setCookies(res, value) {
  const list = Array.isArray(value) ? value : [value]
  res.setHeader('Set-Cookie', list)
}

export { hashPassword }
export const unauthorized = { error: 'Sign in with your employee ID to continue.' }
