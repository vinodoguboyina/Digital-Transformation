import { noStore, readAdmin } from '../../server/auth.js'

export default async function handler(req, res) {
  noStore(res)
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }
  const admin = readAdmin(req)
  res.status(200).json({ employeeId: admin?.employeeId || null })
}
