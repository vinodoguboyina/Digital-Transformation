import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import hero from '../assets/hero-shop.jpg'

gsap.registerPlugin(useGSAP)

export default function Home() {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.from('[data-hero]', { opacity: 0, y: 10, duration: 0.55, stagger: 0.07, ease: 'power2.out' })
    },
    { scope: root },
  )

  return (
    <section id="home" ref={root} className="relative flex min-h-[20rem] flex-1 flex-col bg-ink">
      <div className="relative flex min-h-[20rem] flex-1 flex-col justify-center">
        <img
          src={hero}
          alt="Precision CNC shop floor"
          className="absolute inset-0 h-full w-full object-cover object-[58%_center]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,39,72,0.82)_0%,rgba(12,39,72,0.55)_42%,rgba(12,39,72,0.18)_70%,transparent_88%)] sm:bg-[linear-gradient(90deg,rgba(12,39,72,0.78)_0%,rgba(12,39,72,0.42)_38%,rgba(12,39,72,0.12)_62%,transparent_82%)]" />
        <div className="relative z-10 mx-auto flex w-full max-w-[1200px] items-center px-4 py-8 sm:px-6 sm:py-10">
          <div className="w-full max-w-xl">
            <span data-hero className="block h-[2px] w-10 bg-sky-300" />
            <p data-hero className="mt-4 text-[13px] font-medium text-sky-200 sm:mt-5 sm:text-[14px]">
              Shop-floor software
            </p>
            <h1 data-hero className="mt-2 text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.03em] text-white sm:text-[2.25rem] lg:text-[2.85rem]">
              Digital Transformation
            </h1>
            <p data-hero className="mt-3 text-[14px] leading-6 text-white/90 sm:mt-4 sm:text-[16px] sm:leading-7">
              Industry 4.0 solutions that improve efficiency, quality and productivity.
            </p>
            <div data-hero className="mt-6 sm:mt-8">
              <a href="#products" className="inline-flex h-11 items-center bg-white px-5 text-[14px] font-semibold text-ink transition-colors hover:bg-paper">
                View products
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
