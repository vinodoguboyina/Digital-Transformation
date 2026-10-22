import { changeAccount, noStore, readAdmin, setCookies, unauthorized } from '../../server/auth.js'

function send(res, status, body) {
  noStore(res)
  res.status(status).json(body)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    send(res, 405, { error: 'Method not allowed.' })
    return
  }
  const admin = readAdmin(req)
  if (!admin) {
    send(res, 401, unauthorized)
    return
  }
  try {
    const result = await changeAccount(admin.employeeId, req.body || {})
    if (result.cookie) setCookies(res, result.cookie)
    send(res, result.status, result.body)
  } catch (error) {
    send(res, 500, { error: error.message || 'Could not update the employee login.' })
  }
}
