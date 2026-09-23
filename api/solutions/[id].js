import { deleteSolution } from '../../server/github-solutions.js'

function send(res, status, body) {
  res.status(status).json(body)
}

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    send(res, 405, { error: 'Method not allowed.' })
    return
  }
  try {
    const result = await deleteSolution(String(req.query.id || ''))
    send(res, result.status, result.body)
  } catch (error) {
    send(res, 500, { error: error.message || 'Could not delete that solution.' })
  }
}
