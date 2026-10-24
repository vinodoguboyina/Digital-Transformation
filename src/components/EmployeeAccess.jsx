import { useState } from 'react'
import { Form, Input, Modal } from 'antd'
import { useAuth } from '@/auth'
import { BrandMark } from '@/components/SiteHeader'

export default function EmployeeAccess() {
  const { admin, login, logout, changeLogin } = useAuth()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('login')
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [nextId, setNextId] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function close() {
    setOpen(false)
    setError('')
    setPassword('')
    setNextPassword('')
  }

  function openLogin() {
    setMode('login')
    setError('')
    setOpen(true)
  }

  function openChange() {
    setMode('change')
    setError('')
    setNextId(admin || '')
    setNextPassword('')
    setOpen(true)
  }

  async function onLogin() {
    if (!employeeId.trim() || !password) {
      setError('Employee ID and password are required.')
      return Promise.reject()
    }
    setBusy(true)
    setError('')
    try {
      await login(employeeId, password)
      setOpen(false)
      setEmployeeId('')
      setPassword('')
    } catch (err) {
      setError(err.message || 'Could not sign in.')
      return Promise.reject()
    } finally {
      setBusy(false)
    }
  }

  async function onChange() {
    if (!nextId.trim() || !nextPassword) {
      setError('Employee ID and password are required.')
      return Promise.reject()
    }
    setBusy(true)
    setError('')
    try {
      await changeLogin({ employeeId: nextId, password: nextPassword })
      close()
    } catch (err) {
      setError(err.message || 'Could not update the employee login.')
      return Promise.reject()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <footer className="bg-ink text-white">
        <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <BrandMark onInk />
            <p className="mt-5 max-w-sm text-[14px] leading-7 text-white/60">
              Shop-floor software for manufacturing plants.
            </p>
          </div>
          <div>
            <p className="text-[13px] font-medium text-white/50">Site</p>
            <ul className="mt-4 space-y-2.5 text-[14px] text-white/70">
              <li>
                <a href="#home" className="hover:text-white">
                  Home
                </a>
              </li>
              <li>
                <a href="#products" className="hover:text-white">
                  Products
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-[12px] text-white/45 sm:px-6 lg:px-8">
            <p>© {new Date().getFullYear()} Digital Transformation</p>
            {admin ? (
              <span className="flex flex-wrap items-center gap-4 text-white/70">
                <span>Signed in as {admin}</span>
                <button type="button" onClick={openChange} className="hover:text-white">
                  Change login
                </button>
                <button type="button" onClick={logout} className="hover:text-white">
                  Sign out
                </button>
              </span>
            ) : (
              <button type="button" onClick={openLogin} className="hover:text-white/70">
                Employee login
              </button>
            )}
          </div>
        </div>
      </footer>

      <Modal
        open={open && !admin}
        title="Employee login"
        onCancel={close}
        onOk={onLogin}
        okText="Sign in"
        cancelText="Close"
        confirmLoading={busy}
        centered
        destroyOnHidden
        width={440}
        style={{ maxWidth: 'calc(100vw - 24px)' }}
      >
        <p className="mb-4 text-sm text-slate-600">Staff access only. Visitors cannot change this site.</p>
        <Form layout="vertical" autoComplete="off">
          <Form.Item label="Employee ID" required>
            <Input
              autoComplete="username"
              name="employee-id"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
            />
          </Form.Item>
          <Form.Item label="Password" required>
            <Input.Password
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Form.Item>
        </Form>
        {error ? <p className="mb-0 text-sm text-rose-600">{error}</p> : null}
      </Modal>

      <Modal
        open={open && Boolean(admin) && mode === 'change'}
        title="Change employee login"
        onCancel={close}
        onOk={onChange}
        okText="Save login"
        cancelText="Close"
        confirmLoading={busy}
        centered
        destroyOnHidden
        width={440}
        style={{ maxWidth: 'calc(100vw - 24px)' }}
      >
        <p className="mb-4 text-sm text-slate-600">Only this new ID and password will work after you save. The old login is removed.</p>
        <Form layout="vertical" autoComplete="off">
          <Form.Item label="Employee ID" required>
            <Input
              autoComplete="username"
              value={nextId}
              onChange={(event) => setNextId(event.target.value)}
            />
          </Form.Item>
          <Form.Item label="Password" required>
            <Input.Password
              autoComplete="new-password"
              value={nextPassword}
              onChange={(event) => setNextPassword(event.target.value)}
            />
          </Form.Item>
        </Form>
        {error ? <p className="mb-0 text-sm text-rose-600">{error}</p> : null}
      </Modal>
    </>
  )
}
