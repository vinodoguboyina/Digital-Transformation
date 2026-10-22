import { readAdmin, unauthorized } from '../../../../server/auth.js'
import { deleteFlyer, saveFlyerUpload } from '../../../../server/github-solutions.js'

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
  const solutionId = String(req.query.id || '')
  const flyerId = String(req.query.flyerId || '')
  try {
    if (!readAdmin(req)) {
      send(res, 401, unauthorized)
      return
    }
    if (req.method === 'PUT') {
      const result = await saveFlyerUpload(solutionId, req, flyerId)
      send(res, result.status, result.body)
      return
    }
    if (req.method === 'DELETE') {
      const result = await deleteFlyer(solutionId, flyerId)
      send(res, result.status, result.body)
      return
    }
    send(res, 405, { error: 'Method not allowed.' })
  } catch (error) {
    send(res, 500, { error: error.message || 'Could not update that flyer.' })
  }
}
