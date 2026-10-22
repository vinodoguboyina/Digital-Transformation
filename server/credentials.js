import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const filePath = path.join(dir, 'credentials.json')
const envPath = path.join(dir, '..', '.env')

function readDotEnv() {
  try {
    const out = {}
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const index = trimmed.indexOf('=')
      if (index <= 0) continue
      let value = trimmed.slice(index + 1).trim()
      if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
        value = value.slice(1, -1)
      }
      out[trimmed.slice(0, index).trim()] = value
    }
    return out
  } catch {
    return {}
  }
}

export function bootstrapEnv() {
  const file = readDotEnv()
  return {
    ADMIN_EMPLOYEE_ID: String(file.ADMIN_EMPLOYEE_ID || process.env.ADMIN_EMPLOYEE_ID || '').trim(),
    ADMIN_PASSWORD_HASH: String(file.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD_HASH || '').trim(),
    ADMIN_USERS: String(file.ADMIN_USERS || process.env.ADMIN_USERS || '').trim(),
    SESSION_SECRET: String(file.SESSION_SECRET || process.env.SESSION_SECRET || '').trim(),
  }
}

let memory = null

function asUsers(record) {
  const id = String(record?.employeeId || '').trim()
  const hash = String(record?.passwordHash || '').trim()
  if (!id || !hash) return []
  return [{ id, hash }]
}

export function memoryUsers() {
  return memory
}

export function setMemoryUsers(users) {
  memory = users?.length ? users : null
}

export function readFileUsers() {
  try {
    if (!fs.existsSync(filePath)) return []
    return asUsers(JSON.parse(fs.readFileSync(filePath, 'utf8')))
  } catch {
    return []
  }
}

export function writeFileUsers(employeeId, passwordHash) {
  fs.writeFileSync(filePath, `${JSON.stringify({ employeeId, passwordHash }, null, 2)}\n`, { mode: 0o600 })
}

export function writeBootstrapEnv(employeeId, passwordHash) {
  let text = ''
  try {
    text = fs.readFileSync(envPath, 'utf8')
  } catch {
    text = ''
  }
  const next = {
    ADMIN_EMPLOYEE_ID: employeeId,
    ADMIN_PASSWORD_HASH: `'${passwordHash}'`,
  }
  const seen = new Set()
  const lines = text ? text.split(/\r?\n/) : []
  const out = lines.map((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return line
    const index = trimmed.indexOf('=')
    if (index <= 0) return line
    const key = trimmed.slice(0, index).trim()
    if (!(key in next)) return line
    seen.add(key)
    return `${key}=${next[key]}`
  })
  for (const [key, value] of Object.entries(next)) {
    if (!seen.has(key)) out.push(`${key}=${value}`)
  }
  while (out.length && out[out.length - 1] === '') out.pop()
  fs.writeFileSync(envPath, `${out.join('\n')}\n`)
}

export function storedUsers() {
  return memoryUsers() || readFileUsers()
}
