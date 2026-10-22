import { readAdmin, unauthorized } from '../server/auth.js'
import { saveCategory } from '../server/github-solutions.js'

function send(res, status, body) {
  res.status(status).json(body)
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      if (!readAdmin(req)) {
        send(res, 401, unauthorized)
        return
      }
      const result = await saveCategory(req.body || {})
      send(res, result.status, result.body)
      return
    }
    send(res, 405, { error: 'Method not allowed.' })
  } catch (error) {
    send(res, 500, { error: error.message || 'Could not update the category.' })
  }
}
