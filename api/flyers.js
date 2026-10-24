import { readPublicFlyer } from '../server/github-solutions.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }
  try {
    const result = await readPublicFlyer(req.query.file)
    if (result.status !== 200 || !result.buffer) {
      res.status(result.status || 404).json({ error: 'Flyer not found.' })
      return
    }
    res.setHeader('Content-Type', result.type)
    res.setHeader('Content-Disposition', `inline; filename="${result.name || 'flyer'}"`)
    res.setHeader('Cache-Control', 'public, max-age=120')
    res.send(result.buffer)
  } catch (error) {
    res.status(500).json({ error: error.message || 'Could not open that flyer.' })
  }
}
