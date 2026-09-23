import { useEffect, useState } from 'react'
import { ClipboardList, Eye, Gauge, ShieldAlert, ShieldCheck, Wrench, Zap } from 'lucide-react'
import shopImg from '../assets/benefits/benefit-shop.png'
import qualityLateImg from '../assets/benefits/benefit-quality-late.png'
import gaugesMissingImg from '../assets/benefits/benefit-gauges-missing.png'
import noLiveImg from '../assets/benefits/benefit-no-live-view.png'

const problems = [
  {
    title: 'Paper on the shop floor',
    text: 'Job cards and test sheets still move by hand, so the line waits on the last person who wrote them down.',
    image: shopImg,
    icon: ClipboardList,
  },
  {
    title: 'Quality found too late',
    text: 'Defects show up after the batch is done. Rework is already in the schedule.',
    image: qualityLateImg,
    icon: ShieldAlert,
  },
  {
    title: 'Tools and gauges go missing',
    text: 'Issue, return, and calibration dates live in a register. A missed gauge stops a dispatch.',
    image: gaugesMissingImg,
    icon: Wrench,
  },
  {
    title: 'No live picture for management',
    text: 'Orders and machine status are scattered, so decisions wait for a compiled report.',
    image: noLiveImg,
    icon: Eye,
  },
]

const benefits = [
  { title: 'Higher efficiency', text: 'The same shift finishes more of the plan.', icon: Zap },
  { title: 'Better quality', text: 'Drift is visible while the job is still on the machine.', icon: ShieldCheck },
  { title: 'Real-time insights', text: 'Quality, orders, and progress sit in one view.', icon: Eye },
  { title: 'Increased productivity', text: 'People stay on the job instead of chasing paper.', icon: Gauge },
]

export default function Benefits() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % problems.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section id="about" className="bg-white px-4 py-16 text-slate-900 sm:px-6 lg:px-10 lg:py-20">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-brand">WHAT WE ADDRESS</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            The daily gaps that slow a manufacturing line
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            Most plants already have machines and people. What they lack is a clear digital record of quality, tools, tests, and orders while the shift is still running.
          </p>
          <ul className="mt-8 space-y-5">
            {problems.map((item, index) => {
              const Icon = item.icon
              return (
                <li key={item.title}>
                  <button type="button" className="flex gap-3 text-left" onClick={() => setActive(index)}>
                    <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg ${index === active ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span>
                      <p className={`font-semibold ${index === active ? 'text-brand' : ''}`}>{item.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.text}</p>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="relative h-72 overflow-hidden rounded-2xl sm:h-96 lg:h-[32rem]">
          {problems.map((item, index) => (
            <img
              key={item.title}
              src={item.image}
              alt=""
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                index === active ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mx-auto mt-20 w-full max-w-7xl rounded-3xl bg-[#07111f] px-6 py-10 text-white sm:px-10 lg:py-12">
        <p className="text-xs font-semibold tracking-[0.16em] text-sky-300">BENEFITS YOU GET</p>
        <h2 className="mt-2 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
          What changes once the work is on the system
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
          {benefits.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="flex items-start gap-4 border-t border-white/15 pt-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span>
                  <p className="text-lg font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">{item.text}</p>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
