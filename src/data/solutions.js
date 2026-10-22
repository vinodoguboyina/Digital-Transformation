import img_gauges from '../assets/products/photo-gauges.jpg'
import img_quality from '../assets/products/photo-quality.jpg'
import img_spc from '../assets/products/photo-spc.jpg'
import img_lab from '../assets/products/photo-lab.jpg'
import img_indiq from '../assets/products/photo-indiq.jpg'
import img_jobcard from '../assets/products/photo-jobcard.jpg'
import img_tools from '../assets/products/photo-tools.jpg'
import img_orders from '../assets/products/photo-orders.jpg'
import img_projects from '../assets/products/photo-projects.jpg'
import img_viewer from '../assets/products/photo-viewer.jpg'

export const categories = [
  {
    "id": "quality-management",
    "name": "Quality Management",
    "text": "Dimensional data from instruments and CMMs, ballooned drawings, inspection reports and calibration alerts. Deviation is visible before the batch is closed."
  },
  {
    "id": "production-monitoring",
    "name": "Production Monitoring",
    "text": "Job cards, poka-yoke on job setup, production data capture, machine-wise OEE and energy. Availability, performance and quality on the same board."
  },
  {
    "id": "inventory",
    "name": "Inventory",
    "text": "Tools, jigs, fixtures, spares, consumables and gauges. Issue and return against operator or production order, with usage by machine, shift and part."
  },
  {
    "id": "process-planning",
    "name": "Process Planning",
    "text": "Process charts, machine availability, scheduling, production review and rescheduling when priorities change. Digitized production orders instead of a compiled pack."
  }
]

export const solutions = [
  {
    id: "gauges",
    title: "Gauge Management Software",
    text: "Register every gauge with identity, location and due date. Alerts fire before calibration is missed, so a gauge past date is not still on the machine.",
    category: "quality-management",
    url: "",
    image: img_gauges,
    flyers: [{"id":"04fb5aac-b483-43fd-9880-5b4b036d6420","name":"GAGEtrace Product Brochure.pdf","file":"gauges/04fb5aac_b483_43fd_9880_5b4b036d6420.pdf","type":"application/pdf"}],
  },
  {
    id: "quality",
    title: "Quality Status – INDi4.0 Basic",
    text: "Capture process quality against set limits and notify deviations. First-off and in-process results sit on the job, not on a sheet entered after the bin has moved.",
    category: "quality-management",
    url: "",
    image: img_quality,
    flyers: [],
  },
  {
    id: "spc",
    title: "Quality Status – INDi4.0 Basic + SPC",
    text: "The same quality capture, with control charts and process capability on the characteristics already being inspected.",
    category: "quality-management",
    url: "",
    image: img_spc,
    flyers: [],
  },
  {
    id: "lab",
    title: "Digitisation of Testing Labs",
    text: "Dimensional measurement for IPID monitoring. Data from measuring instruments and CMMs, and the inspection report generated from the same entry.",
    category: "quality-management",
    url: "http://localhost:5540/",
    image: img_lab,
    flyers: [],
  },
  {
    id: "indiq",
    title: "INDIQ 4.0 – AI Manufacturing Intelligence",
    text: "Ballooned drawing, extracted characteristics, CMM/VMS program and the final inspection report in one loop, so the checklist is not typed from a paper print.",
    category: "quality-management",
    url: "",
    image: img_indiq,
    flyers: [],
  },
  {
    id: "jobcard",
    title: "Digitisation of Job Cards",
    text: "Job card display: when the card is received or scanned, the operator sees the interlinked documents. Routing and sign-off stay with the job.",
    category: "production-monitoring",
    url: "",
    image: img_jobcard,
    flyers: [],
  },
  {
    id: "tools",
    title: "Tool Room Inventory Management",
    text: "Register tools, jigs and fixtures. Record issue and return against operator or production order. Usage by machine, shift and part number, with remaining life at issue.",
    category: "inventory",
    url: "",
    image: img_tools,
    flyers: [{"id":"1718f0af-e18f-470c-8d78-701a74396714","name":"INVENTIX Product Brochure.pdf","file":"tools/1718f0af_e18f_470c_8d78_701a74396714.pdf","type":"application/pdf"},{"id":"1f77bf99-9a33-4f60-a74f-8d2dca6bc0e8","name":"CRIBmanager Product Brochure.pdf","file":"tools/1f77bf99_9a33_4f60_a74f_8d2dca6bc0e8.pdf","type":"application/pdf"}],
  },
  {
    id: "orders",
    title: "Order Management App for Top Management",
    text: "Digitized production orders. Supervisors review and approve the plan; leadership sees open orders, promised dates and dispatch without waiting for a compiled file.",
    category: "process-planning",
    url: "",
    image: img_orders,
    flyers: [],
  },
  {
    id: "projects",
    title: "Project Management App",
    text: "Risk mitigation and rescheduling when the machine schedule changes. Internal tasks, owners and dates sit next to the production plan.",
    category: "process-planning",
    url: "",
    image: img_projects,
    flyers: [],
  },
  {
    id: "viewer",
    title: "3D Viewer",
    text: "Process visualization on the shop PC. Open the model with the job without a CAD seat on every terminal.",
    category: "process-planning",
    url: "",
    image: img_viewer,
    flyers: [],
  },
]

export const customers = [
  {
    "id": "tesa",
    "name": "Tesa",
    "image": "/customers/tesa.svg"
  },
  {
    "id": "karakal-dubai",
    "name": "Karakal Dubai",
    "image": "/customers/karakal-dubai.svg"
  },
  {
    "id": "eagle-bengaluru",
    "name": "Eagle Bengaluru",
    "image": "/customers/eagle-bengaluru.svg"
  }
]

if (import.meta.hot) {
  import.meta.hot.accept()
}
