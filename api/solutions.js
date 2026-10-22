import { readAdmin, unauthorized } from '../server/auth.js'
import { listSolutions, saveSolution } from '../server/github-solutions.js'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
}

function send(res, status, body) {
  res.status(status).json(body)
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      send(res, 200, await listSolutions())
      return
    }
    if (req.method === 'POST') {
      if (!readAdmin(req)) {
        send(res, 401, unauthorized)
        return
      }
      const result = await saveSolution(req.body || {})
      send(res, result.status, result.body)
      return
    }
    send(res, 405, { error: 'Method not allowed.' })
  } catch (error) {
    send(res, 500, { error: error.message || 'Could not update solutions.' })
  }
}
