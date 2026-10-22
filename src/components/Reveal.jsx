import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(useGSAP, ScrollTrigger)

export default function Reveal({ children, className, delay = 0 }) {
  const ref = useRef(null)

  useGSAP(() => {
    const node = ref.current
    if (!node) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.from(node, {
      opacity: 0,
      y: 10,
      duration: 0.5,
      delay,
      ease: 'power2.out',
      scrollTrigger: { trigger: node, start: 'top 90%' },
    })
  }, { scope: ref })

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
