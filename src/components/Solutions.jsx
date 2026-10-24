import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileExcelOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FolderAddOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { Button, Form, Input, Modal, Select, Tooltip } from 'antd'
import { useEffect, useRef, useState } from 'react'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { useAuth } from '@/auth'
import { categories as savedCategories, solutions as savedSolutions } from '@/data/solutions'
import Reveal from '@/components/Reveal'
import { cn } from '@/lib/utils'

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

const emptyForm = { id: '', title: '', text: '', image: '', url: '', category: '', flyers: [], lockedCategory: false }
const FLYER_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.bmp,.tif,.tiff,.txt,.csv,.rtf,.odt,.ods,image/*,application/pdf'
const MAX_FLYER_BYTES = 25 * 1024 * 1024
const FLYER_CHUNK_BYTES = 3 * 1024 * 1024

function withFlyers(item) {
  return { ...item, flyers: Array.isArray(item.flyers) ? item.flyers : [] }
}

function IconTip({ label, onClick, href, danger, className, children, named }) {
  const classes = cn(
    'inline-flex items-center justify-center rounded-lg leading-none transition',
    named ? 'h-9 gap-1.5 px-3 text-sm font-semibold' : 'h-8 w-8 text-[16px]',
    danger ? 'text-slate-500 hover:bg-rose-50 hover:text-rose-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
    className,
  )
  const content = named ? (
    <>
      {children}
      <span>{label}</span>
    </>
  ) : (
    children
  )
  const control = href ? (
    <a href={href} target="_blank" rel="noreferrer" aria-label={label} className={classes} onClick={(event) => event.stopPropagation()}>
      {content}
    </a>
  ) : (
    <button type="button" aria-label={label} className={classes} onClick={onClick}>
      {content}
    </button>
  )
  if (named) return control
  return (
    <Tooltip title={label} mouseEnterDelay={0.1}>
      {control}
    </Tooltip>
  )
}

function flyerKind(flyer) {
  const name = flyer.name || ''
  const type = flyer.type || ''
  if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i.test(name)) return 'image'
  if (type.includes('pdf') || /\.pdf$/i.test(name)) return 'pdf'
  if (/\.xlsx?$/i.test(name) || type.includes('excel') || type.includes('spreadsheet')) return 'sheet'
  if (/\.docx?$/i.test(name) || type.includes('word')) return 'word'
  return 'file'
}

function FlyerIcon({ flyer, className }) {
  const kind = flyerKind(flyer)
  if (kind === 'pdf') return <FilePdfOutlined className={className || 'text-rose-500'} />
  if (kind === 'word') return <FileWordOutlined className={className || 'text-blue-600'} />
  if (kind === 'sheet') return <FileExcelOutlined className={className || 'text-emerald-600'} />
  return <FileOutlined className={className} />
}

function canPreviewFlyer(flyer) {
  const kind = flyerKind(flyer)
  return kind === 'image' || kind === 'pdf'
}

function downloadFlyer(flyer) {
  if (!flyer?.url) return
  const link = document.createElement('a')
  link.href = flyer.url
  link.download = flyer.name || 'flyer'
  link.rel = 'noreferrer'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function FlyerPreview({ flyer, onPreview, onReplace, onDelete, compact, admin }) {
  const kind = flyerKind(flyer)
  if (compact) {
    return (
      <button type="button" onClick={() => onPreview(flyer)} className="text-[13px] font-medium text-brand hover:underline">
        Preview flyer
      </button>
    )
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex min-w-0 items-center gap-3">
        {kind === 'image' ? (
          <img src={flyer.url} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
        ) : (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded bg-white text-slate-500">
            <FlyerIcon flyer={flyer} className="text-lg" />
          </span>
        )}
        <p className="min-w-0 truncate text-sm font-medium text-slate-800">{flyer.name || 'Flyer'}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="small" icon={<EyeOutlined />} onClick={() => onPreview(flyer)}>
          Preview
        </Button>
        {admin ? (
          <>
            <Button size="small" icon={<ReloadOutlined />} onClick={onReplace}>
              Replace
            </Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={onDelete}>
              Delete
            </Button>
          </>
        ) : null}
      </div>
    </div>
  )
}

function PdfCanvasPreview({ url, name, onDownload }) {
  const hostRef = useRef(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let ignore = false
    const host = hostRef.current
    if (!host || !url) return undefined
    host.replaceChildren()
    setError(false)

    async function draw() {
      try {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker
        const doc = await pdfjs.getDocument(url).promise
        if (ignore) return
        for (let number = 1; number <= doc.numPages; number += 1) {
          const page = await doc.getPage(number)
          if (ignore) return
          const width = host.clientWidth || 760
          const base = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: width / base.width })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.className = 'mb-3 w-full rounded bg-white last:mb-0'
          await page.render({
            canvasContext: canvas.getContext('2d'),
            viewport,
            canvas,
          }).promise
          if (ignore) return
          host.appendChild(canvas)
        }
      } catch {
        if (!ignore) setError(true)
      }
    }

    draw()
    return () => {
      ignore = true
      host.replaceChildren()
    }
  }, [url])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <FilePdfOutlined className="text-4xl text-rose-500" />
        <p className="mt-4 text-base font-semibold text-slate-900">Preview is not available</p>
        <p className="mt-1 text-sm text-slate-600">Download the file to open it.</p>
        <button
          type="button"
          onClick={onDownload}
          className="mt-5 inline-flex items-center gap-2 bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-brand"
        >
          <DownloadOutlined />
          Download
        </button>
      </div>
    )
  }

  return <div ref={hostRef} aria-label={name} className="max-h-[70vh] overflow-auto bg-slate-100 p-3" />
}

function demoHref(url) {
  const value = url.trim()
  if (!value) return ''
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value
  return `http://${value}`
}

function openDemo(url) {
  const href = demoHref(url || '')
  if (!href) return
  const opened = window.open(href, '_blank', 'noopener,noreferrer')
  if (opened) opened.opener = null
}

export default function Solutions() {
  const { admin } = useAuth()
  const [solutions, setSolutions] = useState(savedSolutions)
  const [categories, setCategories] = useState(savedCategories)
  const [form, setForm] = useState(null)
  const [categoryForm, setCategoryForm] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(null)
  const [dragId, setDragId] = useState('')
  const [overId, setOverId] = useState('')
  const [preview, setPreview] = useState(null)
  const [family, setFamily] = useState('all')
  const dragIdRef = useRef('')
  const fileRef = useRef(null)
  const flyerRef = useRef(null)
  const flyerTarget = useRef({ solutionId: '', flyerId: '' })

  function showNotice(text, ok = true) {
    const next = { text, ok }
    setNotice(next)
    window.setTimeout(() => setNotice((current) => (current === next ? null : current)), 3000)
  }

  useEffect(() => {
    if (!admin) {
      setForm(null)
      setCategoryForm(null)
    }
  }, [admin])

  useEffect(() => {
    let ignore = false
    fetch('/api/solutions')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (ignore || !data) return
        if (Array.isArray(data)) {
          setSolutions(data.map(withFlyers))
          return
        }
        if (Array.isArray(data.solutions)) setSolutions(data.solutions.map(withFlyers))
        if (Array.isArray(data.categories)) setCategories(data.categories)
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [])

  function openAdd(categoryId = '') {
    setError('')
    setForm({
      ...emptyForm,
      id: crypto.randomUUID(),
      category: categoryId || '',
      lockedCategory: Boolean(categoryId),
    })
  }

  function openCategory() {
    setError('')
    setCategoryForm({ id: '', name: '', text: '' })
  }

  function openEditCategory(category) {
    setError('')
    setCategoryForm({ id: category.id, name: category.name, text: category.text || '' })
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
      content: `“${item.title}” will be removed, including its image and flyers.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Keep it',
      async onOk() {
        sessionStorage.setItem('dt-scroll', JSON.stringify({ y: window.scrollY, t: Date.now() }))
        const response = await fetch(`/api/solutions/${encodeURIComponent(id)}`, { method: 'DELETE' })
        const result = await response.json().catch(() => null)
        if (!response.ok) throw new Error(result?.error || 'Delete failed')
        setSolutions((current) => current.filter((solution) => solution.id !== id))
        showNotice('Solution deleted.')
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

  async function saveSolution() {
    if (!form?.title?.trim() || !form?.text?.trim()) {
      setError('Name and description are required.')
      return Promise.reject()
    }
    const payload = {
      id: form.id,
      title: form.title.trim(),
      text: form.text.trim(),
      category: form.category || '',
      url: (form.url || '').trim(),
      imageBase64: form.image?.startsWith('data:') ? form.image : undefined,
    }
    if (categories.length > 0 && !payload.category) {
      setError('Choose a category.')
      return Promise.reject()
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
        return Promise.reject()
      }
      const editing = solutions.some((solution) => solution.id === saved.id)
      setSolutions((current) => {
        const exists = current.some((solution) => solution.id === saved.id)
        const next = withFlyers({ ...saved, flyers: saved.flyers || current.find((item) => item.id === saved.id)?.flyers || [] })
        return exists ? current.map((solution) => (solution.id === saved.id ? next : solution)) : [...current, next]
      })
      setForm(null)
      setError('')
      showNotice(editing ? 'Solution updated.' : 'Solution added.')
    } catch {
      setError('Could not save.')
      return Promise.reject()
    }
  }

  async function saveCategory() {
    const name = categoryForm?.name?.trim()
    if (!name) {
      setError('Category name is required.')
      return Promise.reject()
    }
    const id = categoryForm.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || crypto.randomUUID()
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, text: categoryForm.text || '' }),
      })
      const saved = await response.json().catch(() => null)
      if (!response.ok || !saved?.id) {
        setError(saved?.error || 'Could not save the category.')
        return Promise.reject()
      }
      setCategories((current) => {
        const exists = current.some((category) => category.id === saved.id)
        return exists ? current.map((category) => (category.id === saved.id ? saved : category)) : [...current, saved]
      })
      setCategoryForm(null)
      setError('')
      showNotice(categoryForm.id ? 'Category updated.' : 'Category added.')
    } catch {
      setError('Could not save the category.')
      return Promise.reject()
    }
  }

  function removeCategory(id) {
    const category = categories.find((item) => item.id === id)
    if (!category) return
    Modal.confirm({
      title: 'Delete this category?',
      content: `“${category.name}” will be removed. Solutions in it stay on the page.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Keep it',
      async onOk() {
        const response = await fetch(`/api/categories/${encodeURIComponent(id)}`, { method: 'DELETE' })
        const result = await response.json().catch(() => null)
        if (!response.ok) throw new Error(result?.error || 'Delete failed')
        setCategories((current) => current.filter((item) => item.id !== id))
        setSolutions((current) => current.map((item) => (item.category === id ? { ...item, category: '' } : item)))
        showNotice('Category deleted.')
      },
    })
  }

  function pickFlyer(solutionId, flyerId = '') {
    const item = solutions.find((entry) => entry.id === solutionId)
    const existing = withFlyers(item || (form?.id === solutionId ? form : null)).flyers
    const targetId = flyerId || (existing[0]?.id || '')
    flyerTarget.current = { solutionId, flyerId: targetId }
    if (flyerRef.current) flyerRef.current.value = ''
    flyerRef.current?.click()
  }

  async function onFlyerFile(event) {
    const file = event.target.files?.[0]
    const { solutionId, flyerId } = flyerTarget.current
    event.target.value = ''
    if (!file || !solutionId) return
    if (file.size > MAX_FLYER_BYTES) {
      showNotice('File is too large. Use a file under 25 MB.', false)
      return
    }
    try {
      const path = flyerId
        ? `/api/solutions/${encodeURIComponent(solutionId)}/flyers/${encodeURIComponent(flyerId)}`
        : `/api/solutions/${encodeURIComponent(solutionId)}/flyers`
      sessionStorage.setItem('dt-scroll', JSON.stringify({ y: window.scrollY, t: Date.now() }))
      showNotice('Uploading flyer…')
      const id = crypto.randomUUID()
      const uploadId = crypto.randomUUID()
      const count = Math.max(1, Math.ceil(file.size / FLYER_CHUNK_BYTES))
      const shas = []
      let saved = null
      for (let index = 0; index < count; index += 1) {
        const chunk = file.slice(index * FLYER_CHUNK_BYTES, (index + 1) * FLYER_CHUNK_BYTES)
        const response = await fetch(path, {
          method: flyerId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'X-Flyer-Name': encodeURIComponent(file.name),
            'X-Flyer-Id': id,
            'X-Upload-Id': uploadId,
            'X-Chunk-Index': String(index),
            'X-Chunk-Count': String(count),
            'X-Chunk-Shas': shas.join(','),
          },
          body: chunk,
        })
        saved = await response.json().catch(() => null)
        if (!response.ok) {
          showNotice(saved?.error || 'Could not save that flyer.', false)
          return
        }
        if (saved?.sha) shas.push(saved.sha)
      }
      if (!saved?.id) {
        showNotice(saved?.error || 'Could not save that flyer.', false)
        return
      }
      const nextFlyer = { ...saved, url: URL.createObjectURL(file), name: file.name, type: file.type || saved.type }
      setSolutions((current) =>
        current.map((item) => {
          if (item.id !== solutionId) return item
          const flyers = withFlyers(item).flyers
          return {
            ...item,
            flyers: flyerId ? flyers.map((flyer) => (flyer.id === nextFlyer.id ? nextFlyer : flyer)) : [...flyers, nextFlyer],
          }
        }),
      )
      setForm((current) => {
        if (current?.id !== solutionId) return current
        const flyers = withFlyers(current).flyers
        return {
          ...current,
          flyers: flyerId ? flyers.map((flyer) => (flyer.id === nextFlyer.id ? nextFlyer : flyer)) : [...flyers, nextFlyer],
        }
      })
      showNotice(flyerId ? 'Flyer replaced.' : 'Flyer uploaded.')
    } catch {
      showNotice('Could not save that flyer.', false)
    }
  }

  function removeFlyer(solutionId, flyer) {
    Modal.confirm({
      title: 'Delete this flyer?',
      content: `“${flyer.name}” will be removed from this solution.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Keep it',
      async onOk() {
        const response = await fetch(
          `/api/solutions/${encodeURIComponent(solutionId)}/flyers/${encodeURIComponent(flyer.id)}`,
          { method: 'DELETE' },
        )
        const result = await response.json().catch(() => null)
        if (!response.ok) throw new Error(result?.error || 'Delete failed')
        setSolutions((current) =>
          current.map((item) =>
            item.id === solutionId ? { ...item, flyers: withFlyers(item).flyers.filter((entry) => entry.id !== flyer.id) } : item,
          ),
        )
        setForm((current) =>
          current?.id === solutionId
            ? { ...current, flyers: withFlyers(current).flyers.filter((entry) => entry.id !== flyer.id) }
            : current,
        )
        showNotice('Flyer deleted.')
      },
    })
  }

  async function moveSolution(id, categoryId) {
    const solution = solutions.find((item) => item.id === id)
    const category = categories.find((item) => item.id === categoryId)
    if (!solution || !category || solution.category === categoryId) return
    const previous = solutions
    const moved = { ...solution, category: categoryId }
    setSolutions((current) => [...current.filter((item) => item.id !== id), moved])
    try {
      sessionStorage.setItem('dt-scroll', JSON.stringify({ y: window.scrollY, t: Date.now() }))
      const response = await fetch('/api/solutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: solution.id,
          title: solution.title,
          text: solution.text,
          category: categoryId,
          url: solution.url || '',
        }),
      })
      const saved = await response.json().catch(() => null)
      if (!response.ok || !saved?.id) {
        setSolutions(previous)
        showNotice(saved?.error || 'Could not move that solution.', false)
        return
      }
      setSolutions((current) => current.map((item) => (item.id === saved.id ? saved : item)))
      showNotice(`Moved to ${category.name}.`)
    } catch {
      setSolutions(previous)
      showNotice('Could not move that solution.', false)
    }
  }

  function onDragStart(event, solution) {
    dragIdRef.current = solution.id
    event.dataTransfer.setData('text/plain', solution.id)
    event.dataTransfer.effectAllowed = 'move'
    setDragId(solution.id)
  }

  function onDragEnd() {
    dragIdRef.current = ''
    setDragId('')
    setOverId('')
  }

  function onDragOver(event, categoryId) {
    if (!admin) return
    const solution = solutions.find((item) => item.id === dragIdRef.current)
    if (!categoryId || !solution || solution.category === categoryId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (overId !== categoryId) setOverId(categoryId)
  }

  function onDragLeave(event, categoryId) {
    if (event.currentTarget.contains(event.relatedTarget)) return
    setOverId((current) => (current === categoryId ? '' : current))
  }

  function onDrop(event, categoryId) {
    if (!admin) return
    event.preventDefault()
    const id = event.dataTransfer.getData('text/plain') || dragIdRef.current
    dragIdRef.current = ''
    setDragId('')
    setOverId('')
    moveSolution(id, categoryId)
  }

  const groups = [
    ...categories.map((category) => ({
      ...category,
      items: solutions.filter((solution) => solution.category === category.id),
    })),
    ...(() => {
      const loose = solutions.filter((solution) => !categories.some((category) => category.id === solution.category))
      return loose.length ? [{ id: '', name: 'Uncategorized', items: loose }] : []
    })(),
  ]

  return (
    <section id="products" className="scroll-mt-16 bg-paper px-4 py-14 text-ink sm:px-6 sm:py-16">
      {notice && (
        <div className={`fixed bottom-5 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 px-4 py-2 text-center text-sm font-medium text-white shadow-lg ${notice.ok ? 'bg-emerald-700' : 'bg-rose-700'}`}>
          {notice.text}
        </div>
      )}
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Reveal className="min-w-0">
            <span className="block h-[2px] w-10 bg-brand" />
            <h2 className="mt-5 text-[1.85rem] font-semibold tracking-[-0.02em] sm:text-[2.1rem]">
              {solutions.length === 0 ? 'Add a solution' : 'Products'}
            </h2>
          </Reveal>
          {admin ? (
            <div className="flex flex-wrap gap-2">
              <IconTip named label="Add Category" onClick={openCategory} className="h-10 rounded-lg border border-line bg-white text-ink hover:bg-white">
                <FolderAddOutlined />
              </IconTip>
              <IconTip named label="Add Solution" onClick={() => openAdd()} className="h-10 rounded-lg bg-brand text-white hover:bg-[#1565c0] hover:text-white">
                <PlusOutlined />
              </IconTip>
            </div>
          ) : null}
        </div>

        {solutions.length === 0 && categories.length === 0 ? (
          <div className="mt-8 border border-dashed border-line bg-paper px-6 py-14 text-center">
            <p className="text-lg font-semibold text-slate-900">No solutions yet</p>
            <p className="mt-2 text-sm text-slate-600">Products will appear here once they are published.</p>
            {admin ? (
              <div className="mt-5 flex justify-center">
                <IconTip named label="Add Category" onClick={openCategory} className="h-10 bg-ink text-white hover:bg-brand hover:text-white">
                  <FolderAddOutlined />
                </IconTip>
              </div>
            ) : null}
          </div>
        ) : (
        <>
        <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 border-b border-line">
          <button
            type="button"
            onClick={() => setFamily('all')}
            className={`-mb-px border-b-2 pb-2.5 text-[14px] ${family === 'all' ? 'border-ink font-semibold text-ink' : 'border-transparent font-medium text-slate-500 hover:text-ink'}`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setFamily(category.id)}
              className={`-mb-px border-b-2 pb-2.5 text-[14px] ${family === category.id ? 'border-ink font-semibold text-ink' : 'border-transparent font-medium text-slate-500 hover:text-ink'}`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="mt-10 space-y-12">
          {groups
            .filter((group) => family === 'all' || group.id === family)
            .map((group) => {
            const groupIndex = groups.findIndex((entry) => entry.id === group.id)
            return (
            <div
              key={group.id || 'uncategorized'}
              onDragOver={(event) => onDragOver(event, group.id)}
              onDragLeave={(event) => onDragLeave(event, group.id)}
              onDrop={(event) => onDrop(event, group.id)}
              className={overId === group.id ? 'ring-2 ring-brand ring-offset-2' : ''}
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 max-w-3xl">
                  <h3 className="text-[17px] font-semibold tracking-tight text-ink">
                    <span className="mr-2 text-brand">{String(groupIndex + 1).padStart(2, '0')}</span>
                    {group.name}
                  </h3>
                  {group.text ? <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{group.text}</p> : null}
                </div>
                {admin && group.id ? (
                  <span className="flex flex-wrap items-center gap-1">
                    <IconTip named label="Add Solution" onClick={() => openAdd(group.id)} className="text-ink hover:bg-white hover:text-ink">
                      <PlusOutlined />
                    </IconTip>
                    <IconTip named label="Edit Category" onClick={() => openEditCategory(group)}>
                      <EditOutlined />
                    </IconTip>
                    <IconTip named label="Delete Category" danger onClick={() => removeCategory(group.id)}>
                      <DeleteOutlined />
                    </IconTip>
                  </span>
                ) : null}
              </div>
              {group.items.length === 0 ? (
                <p className="border border-dashed border-line bg-[#f7fafd] px-4 py-8 text-center text-sm text-slate-500">
                  {admin ? (overId === group.id ? 'Drop here' : 'Drag a solution here, or add one.') : 'Solutions in this category will appear here.'}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.items.map((solution) => (
                    <article
                      key={solution.id}
                      draggable={Boolean(admin)}
                      onDragStart={(event) => admin && onDragStart(event, solution)}
                      onDragEnd={onDragEnd}
                      className={`flex flex-col bg-white ${admin ? 'cursor-grab active:cursor-grabbing' : ''} ${dragId === solution.id ? 'opacity-50' : ''}`}
                    >
                      <div className="relative aspect-[16/10] bg-slate-100">
                        {solution.image ? (
                          <img src={solution.image} alt="" draggable={false} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-300">
                            <PictureOutlined className="text-2xl" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col px-4 pt-4 pb-4">
                        <h4 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] break-words text-ink">{solution.title}</h4>
                        <p className="mt-2 text-[13px] leading-relaxed break-words text-slate-600">{solution.text}</p>
                        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 mt-4" onPointerDown={(event) => event.stopPropagation()}>
                          {demoHref(solution.url || '') ? (
                            <button type="button" onClick={() => openDemo(solution.url)} className="text-[13px] font-medium text-brand hover:underline">
                              Live demo
                            </button>
                          ) : null}
                          {withFlyers(solution).flyers.map((flyer) => (
                            <FlyerPreview
                              key={flyer.id}
                              compact
                              admin={Boolean(admin)}
                              flyer={flyer}
                              onPreview={setPreview}
                              onReplace={() => pickFlyer(solution.id, flyer.id)}
                              onDelete={() => removeFlyer(solution.id, flyer)}
                            />
                          ))}
                          {admin ? (
                            <>
                              <button type="button" onClick={() => openEdit(solution)} className="text-[13px] font-medium text-slate-600 hover:text-ink">
                                Edit
                              </button>
                              {withFlyers(solution).flyers.length === 0 ? (
                                <button type="button" onClick={() => pickFlyer(solution.id)} className="text-[13px] font-medium text-slate-600 hover:text-ink">
                                  Upload flyer
                                </button>
                              ) : null}
                              <button type="button" onClick={() => remove(solution.id)} className="text-[13px] font-medium text-slate-600 hover:text-rose-600">
                                Delete
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
            )
          })}
        </div>
        </>
        )}
      </div>

      <input ref={flyerRef} type="file" accept={FLYER_ACCEPT} onChange={onFlyerFile} className="hidden" />
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />

      <Modal
        open={Boolean(categoryForm)}
        title={categories.some((category) => category.id === categoryForm?.id) ? 'Edit Category' : 'Add Category'}
        onCancel={() => { setCategoryForm(null); setError('') }}
        onOk={saveCategory}
        okText="Save Category"
        cancelText="Close"
        centered
        destroyOnHidden
        width={520}
        style={{ maxWidth: 'calc(100vw - 24px)' }}
        styles={{ body: { maxHeight: 'min(70vh, 560px)', overflowY: 'auto' } }}
      >
        {categoryForm ? (
          <Form layout="vertical">
            <Form.Item label="Category Name" required>
              <Input
                value={categoryForm.name}
                onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })}
                placeholder="Quality Management"
              />
            </Form.Item>
            <Form.Item label="Category Description">
              <Input.TextArea
                value={categoryForm.text || ''}
                onChange={(event) => setCategoryForm({ ...categoryForm, text: event.target.value })}
                rows={3}
                placeholder="What this family covers in the plant."
              />
            </Form.Item>
            {error ? <p className="mb-0 text-sm text-rose-600">{error}</p> : null}
          </Form>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(form)}
        title={solutions.some((solution) => solution.id === form?.id) ? 'Edit Solution' : 'Add Solution'}
        onCancel={() => { setForm(null); setError('') }}
        onOk={saveSolution}
        okText="Save Solution"
        cancelText="Close"
        centered
        destroyOnHidden
        width={560}
        style={{ maxWidth: 'calc(100vw - 24px)' }}
        styles={{ body: { maxHeight: 'min(70vh, 640px)', overflowY: 'auto' } }}
      >
        {form ? (
          <Form layout="vertical">
            {form.lockedCategory ? (
              <Form.Item label="Category">
                <Input disabled value={categories.find((category) => category.id === form.category)?.name || form.category} />
              </Form.Item>
            ) : (
              <Form.Item label="Category" required>
                <Select
                  className="w-full"
                  value={form.category || undefined}
                  placeholder="Select a category"
                  onChange={(value) => setForm({ ...form, category: value })}
                  options={categories.map((category) => ({ value: category.id, label: category.name }))}
                />
              </Form.Item>
            )}
            <Form.Item label="Solution Name" required>
              <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </Form.Item>
            <Form.Item label="Live Demo URL">
              <Input
                value={form.url || ''}
                onChange={(event) => setForm({ ...form, url: event.target.value })}
                placeholder="http://localhost:3000"
              />
            </Form.Item>
            <Form.Item label="Description" required>
              <Input.TextArea
                value={form.text}
                onChange={(event) => setForm({ ...form, text: event.target.value })}
                rows={4}
              />
            </Form.Item>
            <Form.Item label="Solution Image (optional)">
              <Button onClick={() => fileRef.current?.click()}>Select Image</Button>
            </Form.Item>
            {form.image ? (
              <img src={form.image} alt="" className="mb-4 max-h-40 w-full max-w-full rounded-lg bg-slate-50 object-contain" />
            ) : null}
            {solutions.some((solution) => solution.id === form.id) ? (
              <Form.Item label="Flyer">
                {withFlyers(form).flyers.length === 0 ? (
                  <>
                    <Button icon={<UploadOutlined />} onClick={() => pickFlyer(form.id)}>
                      Upload flyer
                    </Button>
                    <p className="mt-2 mb-0 text-xs text-slate-500">PDF, Word, image, or similar file. One flyer per solution, up to 25 MB.</p>
                  </>
                ) : (
                  <div className="space-y-2">
                    {withFlyers(form).flyers.map((flyer) => (
                      <FlyerPreview
                        key={flyer.id}
                        admin
                        flyer={flyer}
                        onPreview={setPreview}
                        onReplace={() => pickFlyer(form.id, flyer.id)}
                        onDelete={() => removeFlyer(form.id, flyer)}
                      />
                    ))}
                  </div>
                )}
              </Form.Item>
            ) : null}
            {error ? <p className="mb-0 text-sm text-rose-600">{error}</p> : null}
          </Form>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(preview)}
        title={preview ? `Flyer Preview: ${preview.name}` : 'Flyer Preview'}
        onCancel={() => setPreview(null)}
        footer={null}
        centered
        width={840}
        style={{ maxWidth: 'calc(100vw - 16px)' }}
        styles={{ body: { maxHeight: 'min(75vh, 720px)', overflowY: 'auto' } }}
        destroyOnHidden
      >
        {preview && canPreviewFlyer(preview) && flyerKind(preview) === 'image' ? (
          <img src={preview.url} alt={preview.name} className="max-h-[70vh] w-full rounded-lg bg-slate-50 object-contain" />
        ) : null}
        {preview && canPreviewFlyer(preview) && flyerKind(preview) === 'pdf' ? (
          <PdfCanvasPreview url={preview.url} name={preview.name} onDownload={() => downloadFlyer(preview)} />
        ) : null}
        {preview && !canPreviewFlyer(preview) ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <FlyerIcon flyer={preview} className="text-4xl" />
            <p className="mt-4 text-base font-semibold text-slate-900">Preview is not available</p>
            <p className="mt-1 text-sm text-slate-600">This file type cannot be previewed here. Download it to open it.</p>
            <Button type="primary" icon={<DownloadOutlined />} className="mt-5" onClick={() => downloadFlyer(preview)}>
              Download
            </Button>
          </div>
        ) : null}
      </Modal>
    </section>
  )
}
