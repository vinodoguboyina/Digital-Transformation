import { useState } from 'react'
import { Award, ShieldCheck, TrendingUp } from 'lucide-react'
import hero from '../assets/10.png'

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
    <div id="home" className="relative flex min-h-[100svh] w-full flex-col overflow-hidden bg-[#021018] text-white">
      <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover object-[72%_center]" />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,16,24,0.55)_0%,rgba(2,16,24,0.78)_46%,rgba(2,16,24,0.92)_100%)] md:bg-[linear-gradient(90deg,#021018_0%,rgba(2,16,24,0.9)_26%,rgba(2,16,24,0.45)_48%,transparent_68%)]"
        aria-hidden="true"
      />

      <header className="relative z-20 flex shrink-0 items-start justify-end px-4 py-5 sm:px-8 lg:px-12">
        <nav
          className="hidden items-center gap-1 rounded-full bg-black/30 px-2 py-1.5 ring-1 ring-white/15 backdrop-blur-md md:flex"
          aria-label="Primary"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                link.label === 'Home' ? 'bg-white text-[#07111f]' : 'text-white/90 hover:bg-white/10 hover:text-white'
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-full bg-black/30 text-white ring-1 ring-white/20 backdrop-blur-md md:hidden"
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
            className="absolute right-4 top-16 rounded-2xl border border-white/10 bg-[#071422]/95 p-2 shadow-2xl backdrop-blur md:hidden"
            aria-label="Mobile"
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-sm font-medium text-slate-100 hover:bg-white/10"
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <div className="relative z-10 flex flex-1 -translate-y-8 flex-col justify-center px-4 py-8 sm:-translate-y-14 sm:px-8 lg:px-14">
        <div className="max-w-3xl">
          <p className="hero-rise text-[11px] font-semibold tracking-[0.22em] text-sky-200 sm:text-xs">
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
          <p className="hero-rise mt-5 text-lg font-semibold text-white sm:text-xl" style={{ animationDelay: '0.26s' }}>
            Smart software for smarter manufacturing.
          </p>
          <p className="hero-rise mt-3 max-w-md text-sm leading-relaxed text-slate-300 sm:text-base" style={{ animationDelay: '0.38s' }}>
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

          <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
            {points.map((point, index) => (
              <li key={point.title} className="hero-rise flex gap-3" style={{ animationDelay: `${0.62 + index * 0.08}s` }}>
                <point.icon className="mt-0.5 size-5 shrink-0 text-sky-300" strokeWidth={1.75} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{point.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">{point.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
