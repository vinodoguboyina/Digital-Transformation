import { readAdmin, unauthorized } from '../../server/auth.js'
import { deleteCustomer } from '../../server/github-solutions.js'

function send(res, status, body) {
  res.status(status).json(body)
}

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    send(res, 405, { error: 'Method not allowed.' })
    return
  }
  try {
    if (!readAdmin(req)) {
      send(res, 401, unauthorized)
      return
    }
    const result = await deleteCustomer(String(req.query.id || ''))
    send(res, result.status, result.body)
  } catch (error) {
    send(res, 500, { error: error.message || 'Could not remove that logo.' })
  }
}
