import { logoutCookie, noStore, setCookies } from '../../server/auth.js'

export default async function handler(req, res) {
  noStore(res)
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }
  setCookies(res, logoutCookie())
  res.status(200).json({ ok: true })
}
