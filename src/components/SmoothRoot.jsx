import { useEffect } from 'react'
import { ReactLenis, useLenis } from 'lenis/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

function Bridge() {
  const lenis = useLenis(() => {
    ScrollTrigger.update()
  })

  useEffect(() => {
    if (!lenis) return undefined
    function onClick(event) {
      const link = event.target.closest('a[href^="#"]')
      if (!link) return
      const id = link.getAttribute('href')
      if (!id || id === '#') return
      const target = document.querySelector(id)
      if (!target) return
      event.preventDefault()
      lenis.scrollTo(target, { offset: -64, duration: 1.05 })
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [lenis])

  return null
}

export default function SmoothRoot({ children }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) return children
  return (
    <ReactLenis root options={{ lerp: 0.09, smoothWheel: true, autoRaf: true }}>
      <Bridge />
      {children}
    </ReactLenis>
  )
}
