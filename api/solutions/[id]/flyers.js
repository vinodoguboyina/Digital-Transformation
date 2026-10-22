import { readAdmin, unauthorized } from '../../../server/auth.js'
import { saveFlyerUpload } from '../../../server/github-solutions.js'

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
}

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
      const result = await saveFlyerUpload(String(req.query.id || ''), req)
      send(res, result.status, result.body)
      return
    }
    send(res, 405, { error: 'Method not allowed.' })
  } catch (error) {
    send(res, 500, { error: error.message || 'Could not save that flyer.' })
  }
}
