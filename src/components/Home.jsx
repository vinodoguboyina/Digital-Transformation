import { useState } from 'react'
import { Award, ShieldCheck, TrendingUp } from 'lucide-react'
import hero from '../assets/hero-light.png'

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Products', href: '#products' },
  { label: 'About Us', href: '#about' },
]

const points = [
  {
    icon: ShieldCheck,
    title: 'Higher Efficiency',
    text: 'Streamline operations and reduce downtime.',
  },
  {
    icon: Award,
    title: 'Better Quality',
    text: 'Ensure consistency and compliance.',
  },
  {
    icon: TrendingUp,
    title: 'Greater Productivity',
    text: 'Optimize processes with smart solutions.',
  },
]

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div id="home" className="relative flex min-h-[100svh] w-full flex-col overflow-hidden bg-[#f7f9fc] text-slate-900">
      <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover object-right" />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#f7f9fc_0%,rgba(247,249,252,0.82)_18%,rgba(247,249,252,0.2)_36%,transparent_52%)]"
        aria-hidden="true"
      />

      <header className="relative z-20 flex shrink-0 items-start justify-end px-4 py-5 sm:px-8 lg:px-12">
        <nav
          className="hidden items-center gap-1 rounded-full bg-white/90 px-2 py-1.5 shadow-sm ring-1 ring-slate-200 backdrop-blur-md md:flex"
          aria-label="Primary"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                link.label === 'Home' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-full bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
          {menuOpen ? (
            <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </button>

        {menuOpen && (
          <nav
            id="mobile-nav"
            className="absolute right-4 top-16 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl md:hidden"
            aria-label="Mobile"
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <div className="relative z-10 flex flex-1 -translate-y-8 flex-col justify-center px-4 py-8 sm:-translate-y-14 sm:px-8 lg:px-14">
        <div className="max-w-3xl">
          <p className="hero-rise text-[11px] font-semibold tracking-[0.22em] text-brand sm:text-xs">
            INNOVATION / AUTOMATION / GROWTH
          </p>
          <h1 className="mt-4 text-5xl font-bold leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
            <span className="hero-rise block">Digital</span>
            <span className="block [perspective:600px]" aria-label="Transformation">
              {'Transformation'.split('').map((letter, index) => (
                <span key={`${letter}-${index}`} className="transform-letter" style={{ animationDelay: `${0.2 + index * 0.045}s, 1.1s` }}>
                  {letter}
                </span>
              ))}
            </span>
          </h1>
          <p className="hero-rise mt-5 text-lg font-semibold text-slate-900 sm:text-xl" style={{ animationDelay: '0.26s' }}>
            Smart software for smarter manufacturing.
          </p>
          <p className="hero-rise mt-3 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base" style={{ animationDelay: '0.38s' }}>
            Industry 4.0 solutions that improve efficiency, quality and productivity.
          </p>
          <a
            href="#products"
            className="hero-rise mt-6 inline-flex w-fit items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            style={{ animationDelay: '0.5s' }}
          >
            Explore Our Products
            <span className="ml-2" aria-hidden="true">
              →
            </span>
          </a>

          <ul className="mt-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            {points.map((point, index) => (
              <li
                key={point.title}
                className="hero-rise flex gap-3 rounded-xl bg-white/90 p-3 shadow-sm ring-1 ring-slate-200/80"
                style={{ animationDelay: `${0.62 + index * 0.08}s` }}
              >
                <point.icon className="mt-0.5 size-5 shrink-0 text-brand" strokeWidth={1.75} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">{point.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">{point.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
