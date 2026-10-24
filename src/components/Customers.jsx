import { UploadOutlined } from '@ant-design/icons'
import { Modal } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/auth'
import { useNotice } from '@/notice'
import { customers as savedCustomers } from '@/data/solutions'

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.readAsDataURL(file)
  })
}

function displayName(fileName) {
  return String(fileName || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function filledRow(list) {
  if (list.length === 0) return []
  const row = [...list]
  while (row.length < 8) row.push(...list)
  return row
}

function LogoMark({ customer }) {
  if (customer.image) {
    return <img src={customer.image} alt={customer.name} className="h-7 w-auto max-w-[120px] object-contain sm:h-9 sm:max-w-[160px]" />
  }
  return <span className="text-[13px] font-semibold tracking-[0.18em] text-ink/70">{customer.name.toUpperCase()}</span>
}

export default function Customers() {
  const { admin } = useAuth()
  const notice = useNotice()
  const [customers, setCustomers] = useState(savedCustomers)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    let ignore = false
    fetch('/api/solutions', { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (ignore || !data || !Array.isArray(data.customers)) return
        setCustomers(data.customers)
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [])

  async function onPick(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    const name = displayName(file.name)
    if (!name) {
      setError('Use a logo file with a name.')
      return
    }
    try {
      const imageBase64 = await readFileAsDataUrl(file)
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, imageBase64, fileName: file.name }),
      })
      const saved = await response.json().catch(() => null)
      if (!response.ok || !saved?.id) {
        const text = saved?.error || 'Could not upload that logo.'
        setError(text)
        notice.fail(text)
        return
      }
      setCustomers((current) => (current.some((item) => item.id === saved.id) ? current.map((item) => (item.id === saved.id ? saved : item)) : [...current, saved]))
      notice.ok('Client logo uploaded.')
    } catch {
      setError('Could not upload that logo.')
      notice.fail('Could not upload that logo.')
    }
  }

  function remove(customer) {
    Modal.confirm({
      title: 'Remove this logo?',
      content: `“${customer.name}” will be removed from Our Clients.`,
      okText: 'Remove',
      okType: 'danger',
      cancelText: 'Keep it',
      async onOk() {
        const response = await fetch(`/api/customers/${encodeURIComponent(customer.id)}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        const result = await response.json().catch(() => null)
        if (!response.ok) throw new Error(result?.error || 'Could not remove that logo.')
        setCustomers((current) => current.filter((item) => item.id !== customer.id))
        notice.ok('Client logo removed.')
      },
    })
  }

  if (customers.length === 0 && !admin) return null

  return (
    <section className="shrink-0 border-b border-line bg-white">
      <div className="relative mx-auto w-full max-w-[1200px] px-4 pt-5 pb-2 sm:px-6">
        <div className="flex flex-col items-center text-center">
          <span className="block h-[2px] w-10 bg-brand" />
          <h2 className="mt-3 text-[1.25rem] font-semibold tracking-[-0.02em] text-ink sm:text-[1.4rem]">Our Clients</h2>
        </div>
        {admin ? (
          <div className="mt-2 flex justify-center sm:absolute sm:top-5 sm:right-6 sm:mt-0">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.png,.jpg,.jpeg,.webp,.gif,.svg" className="hidden" onChange={onPick} />
            <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink hover:text-brand">
              <UploadOutlined />
              Upload logo
            </button>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-center text-sm text-rose-600">{error}</p> : null}
        {customers.length === 0 ? (
          <p className="mt-6 pb-8 text-center text-sm text-slate-500">Upload a client logo to show it here.</p>
        ) : null}
      </div>
      {customers.length > 0 ? (
        <div className="logo-marquee relative overflow-hidden py-3.5">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-linear-to-r from-white to-transparent sm:w-20" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-linear-to-l from-white to-transparent sm:w-20" />
          <div className="logo-track flex w-max items-center">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex items-center gap-10 px-5 sm:gap-20 sm:px-10">
                {filledRow(customers).map((customer, index) => (
                  <div key={`${customer.id}-${copy}-${index}`} className="group relative flex h-10 shrink-0 items-center justify-center">
                    <LogoMark customer={customer} />
                    {admin ? (
                      <button type="button" onClick={() => remove(customer)} className="absolute -top-2 -right-4 text-[11px] font-medium text-slate-400 opacity-0 group-hover:opacity-100 hover:text-rose-600">
                        Remove
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
