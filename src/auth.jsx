import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext({
  admin: null,
  ready: false,
  login: async () => {},
  logout: async () => {},
  changeLogin: async () => {},
})

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let ignore = false
    fetch('/api/auth/me', { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!ignore) setAdmin(data?.employeeId || null)
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setReady(true)
      })
    return () => {
      ignore = true
    }
  }, [])

  const value = useMemo(
    () => ({
      admin,
      ready,
      async login(employeeId, password) {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ employeeId, password }),
        })
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.employeeId) {
          throw new Error(data?.error || 'Could not sign in.')
        }
        setAdmin(data.employeeId)
      },
      async logout() {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
        setAdmin(null)
      },
      async changeLogin(details) {
        const response = await fetch('/api/auth/account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(details),
        })
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.employeeId) {
          throw new Error(data?.error || 'Could not update the employee login.')
        }
        setAdmin(data.employeeId)
      },
    }),
    [admin, ready],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
