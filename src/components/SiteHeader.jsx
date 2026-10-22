import { useState } from 'react'

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Products', href: '#products' },
]

export function BrandMark({ onInk = false }) {
  return (
    <a href="#home" className={`flex min-w-0 items-center gap-2 sm:gap-3 ${onInk ? 'text-white' : 'text-ink'}`}>
      <span className={`mark-corners relative grid size-9 shrink-0 place-items-center text-[10px] font-bold tracking-[0.14em] ${onInk ? 'bg-white text-ink' : 'bg-ink text-white'}`}>
        DT
      </span>
      <span className="truncate text-[15px] font-semibold tracking-[-0.02em] sm:text-[16px]">Digital Transformation</span>
    </a>
  )
}

export default function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="h-[3px] bg-brand" />
      <div className="mx-auto flex h-[4.25rem] w-full max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6">
        <BrandMark />
        <nav className="hidden items-center md:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="px-4 py-2 text-[14px] font-medium text-slate-600 transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <button
          type="button"
          className="grid size-10 shrink-0 place-items-center text-ink md:hidden"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <svg viewBox="0 0 24 24" className="size-5" fill="none">
            <path d={open ? 'M6 6l12 12M18 6 6 18' : 'M4 7h16M4 12h16M4 17h16'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {open ? (
        <nav className="border-t border-line px-4 py-3 md:hidden">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} onClick={() => setOpen(false)} className="block py-2.5 text-[15px] text-ink">
              {link.label}
            </a>
          ))}
        </nav>
      ) : null}
    </header>
  )
}
