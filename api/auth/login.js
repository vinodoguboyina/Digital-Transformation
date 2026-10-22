import { loginAdmin, noStore, setCookies } from '../../server/auth.js'

function send(res, status, body) {
  noStore(res)
  res.status(status).json(body)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    send(res, 405, { error: 'Method not allowed.' })
    return
  }
  try {
    const result = await loginAdmin(req.body?.employeeId, req.body?.password, req)
    if (result.cookie) setCookies(res, result.cookie)
    send(res, result.status, result.body)
  } catch (error) {
    send(res, 500, { error: error.message || 'Could not sign in.' })
  }
}
