import { Modal } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { solutions as savedSolutions } from '@/data/solutions'
import { Card, CardContent } from '@/components/ui/card'

function readImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const max = 960
      const scale = Math.min(1, max / img.width, max / img.height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image.'))
    }
    img.src = url
  })
}

const emptyForm = { id: '', title: '', text: '', image: '', url: '' }

function demoHref(url) {
  const value = url.trim()
  if (!value) return ''
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value
  return `http://${value}`
}

async function openDemo(url) {
  const href = demoHref(url || '')
  if (!href) return
  const response = await fetch('/api/open-demo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: href }),
  })
  if (!response.ok) {
    const opened = window.open(href, '_blank')
    if (opened) opened.opener = null
  }
}

export default function Solutions() {
  const [solutions, setSolutions] = useState(savedSolutions)
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    let ignore = false
    fetch('/api/solutions')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!ignore && Array.isArray(data)) setSolutions(data)
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [])

  function openAdd() {
    setError('')
    setForm({ ...emptyForm, id: crypto.randomUUID() })
  }

  function openEdit(item) {
    setError('')
    setForm({ ...item })
  }

  function remove(id) {
    const item = solutions.find((solution) => solution.id === id)
    if (!item) return
    Modal.confirm({
      title: 'Delete this solution?',
      content: `“${item.title}” will be removed from the code and its image will be removed from assets.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Keep it',
      async onOk() {
        sessionStorage.setItem('dt-scroll', JSON.stringify({ y: window.scrollY, t: Date.now() }))
        const response = await fetch(`/api/solutions/${encodeURIComponent(id)}`, { method: 'DELETE' })
        const result = await response.json().catch(() => null)
        if (!response.ok) throw new Error(result?.error || 'Delete failed')
        setSolutions((current) => current.filter((solution) => solution.id !== id))
      },
    })
  }

  async function onFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const image = await readImage(file)
      setForm((current) => (current ? { ...current, image } : current))
      setError('')
    } catch {
      setError('Could not read that image.')
    }
  }

  async function onSubmit(event) {
    event.preventDefault()
    if (!form.title.trim() || !form.text.trim()) {
      setError('Name and description are required.')
      return
    }
    const payload = {
      id: form.id,
      title: form.title.trim(),
      text: form.text.trim(),
      url: (form.url || '').trim(),
      imageBase64: form.image?.startsWith('data:') ? form.image : undefined,
    }
    try {
      sessionStorage.setItem('dt-scroll', JSON.stringify({ y: window.scrollY, t: Date.now() }))
      const response = await fetch('/api/solutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const saved = await response.json().catch(() => null)
      if (!response.ok || !saved?.id) {
        setError(saved?.error || 'Could not save.')
        return
      }
      setSolutions((current) => {
        const exists = current.some((solution) => solution.id === saved.id)
        return exists ? current.map((solution) => (solution.id === saved.id ? saved : solution)) : [...current, saved]
      })
      setForm(null)
    } catch {
      setError('Could not save.')
    }
  }

  return (
    <section id="products" className="scroll-mt-4 bg-[#f5f7fb] px-3 py-10 sm:px-6 sm:py-14 lg:px-10 lg:py-16">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.16em] text-brand">OUR PRODUCTS</p>
            <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
              {solutions.length === 0 ? 'Add a solution' : `${solutions.length} Industry 4.0 Solutions`}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              {solutions.length === 0
                ? 'Nothing is listed yet. Add a solution to show its name and description here.'
                : 'Software for quality, tooling, labs, orders, and the shop floor. Each product replaces a paper step with a live record the team can act on.'}
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex w-fit items-center rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Add solution
          </button>
        </div>

        {solutions.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <p className="text-lg font-semibold text-slate-900">No solutions yet</p>
            <p className="mt-2 text-sm text-slate-600">Add a solution to put it on this page.</p>
            <button
              type="button"
              onClick={openAdd}
              className="mt-5 inline-flex items-center rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Add solution
            </button>
          </div>
        ) : (
        <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(min(100%,17.5rem),1fr))] gap-3 sm:gap-4">
          {solutions.map((solution) => (
            <Card
              key={solution.id}
              className="h-full min-w-0 gap-0 overflow-hidden rounded-xl border-slate-200 bg-white py-0 text-slate-900 shadow-sm"
            >
              {solution.image ? (
                <img
                  src={solution.image}
                  alt=""
                  className="aspect-video w-full max-w-full bg-slate-50 object-contain"
                />
              ) : null}
              <CardContent className="flex min-w-0 flex-1 flex-col px-3.5 py-3.5 sm:px-4">
                <h3 className="break-words text-sm font-semibold leading-snug text-slate-900 sm:text-base">{solution.title}</h3>
                <p className="mt-2 flex-1 break-words text-xs leading-relaxed text-slate-600 sm:text-sm">{solution.text}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  {demoHref(solution.url || '') ? (
                    <button
                      type="button"
                      onClick={() => openDemo(solution.url)}
                      className="text-xs font-semibold text-brand hover:text-blue-700"
                    >
                      Live Demo →
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-slate-300">Live Demo</span>
                  )}
                  <span className="flex gap-3">
                    <button type="button" onClick={() => openEdit(solution)} className="text-xs font-semibold text-slate-600 hover:text-slate-900">
                      Edit
                    </button>
                    <button type="button" onClick={() => remove(solution.id)} className="text-xs font-semibold text-rose-600 hover:text-rose-700">
                      Delete
                    </button>
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-3 sm:p-4">
          <form onSubmit={onSubmit} className="my-auto w-full max-w-lg rounded-2xl bg-white p-4 text-slate-900 shadow-xl sm:p-5">
            <h3 className="text-lg font-semibold">
              {solutions.some((solution) => solution.id === form.id) ? 'Edit solution' : 'Add solution'}
            </h3>
            <label className="mt-4 block text-sm font-medium">
              Project name
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-3 block text-sm font-medium">
              Live demo URL
              <input
                value={form.url || ''}
                onChange={(event) => setForm({ ...form, url: event.target.value })}
                placeholder="http://localhost:3000"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-3 block text-sm font-medium">
              Description
              <textarea
                value={form.text}
                onChange={(event) => setForm({ ...form, text: event.target.value })}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-3">
              <p className="text-sm font-medium">Image <span className="font-normal text-slate-500">(optional)</span></p>
              <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Select image
              </button>
            </div>
            {form.image && (
              <img src={form.image} alt="" className="mt-3 max-h-40 w-full max-w-full rounded-lg bg-slate-50 object-contain" />
            )}
            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setForm(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600">
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
