import img_quality from '../assets/products/screen-quality.png'
import img_spc from '../assets/products/screen-spc.png'
import img_tools from '../assets/products/screen-tools.png'
import img_gauges from '../assets/products/screen-gauges.png'
import img_lab from '../assets/products/screen-lab.png'
import img_orders from '../assets/products/screen-orders.png'
import img_viewer from '../assets/products/screen-3d.png'
import img_jobcard from '../assets/products/screen-jobcard.png'
import img_projects from '../assets/products/screen-projects.png'
import img_indiq from '../assets/products/screen-indiq.png'

export const solutions = [
  {
    id: "quality",
    title: "Quality Status – INDi4.0 Basic",
    text: "Watch production quality while the job is running. Live dashboards show defects so the team can report and correct them before the batch moves on.",
    url: "",
    image: img_quality,
  },
  {
    id: "spc",
    title: "Quality Status – INDi4.0 Basic + SPC",
    text: "Add statistical process control to live quality checks. See process capability and quality trends, and catch drift before it becomes scrap.",
    url: "http://localhost:8090/",
    image: img_spc,
  },
  {
    id: "tools",
    title: "Tool Room Inventory Management",
    text: "Track every tool from the store to the machine. Record issue and return, and watch remaining tool life so a worn tool is replaced on time.",
    url: "http://localhost:5177/login",
    image: img_tools,
  },
  {
    id: "gauges",
    title: "Gauge Management Software",
    text: "Keep each gauge calibrated and accounted for. Store its history, see where it is, and get an alert before the calibration date is missed.",
    url: "",
    image: img_gauges,
  },
  {
    id: "lab",
    title: "Digitisation of Testing Labs",
    text: "Replace paper lab books with digital test records. The lab follows one workflow, and the test report is generated from the same entry.",
    url: "http://localhost:3000/login",
    image: img_lab,
  },
  {
    id: "orders",
    title: "Order Management App for Top Management",
    text: "Give leadership a live view of orders and deliveries. One dashboard shows business performance without waiting for a compiled report.",
    url: "",
    image: img_orders,
  },
  {
    id: "viewer",
    title: "3D Viewer",
    text: "Open CAD models in the browser. Engineers review the part together without installing a separate viewer on every machine.",
    url: "",
    image: img_viewer,
  },
  {
    id: "jobcard",
    title: "Digitisation of Job Cards",
    text: "Take job cards off paper. The shop floor updates the card as the job moves, so production status is visible as the shift runs.",
    url: "",
    image: img_jobcard,
  },
  {
    id: "projects",
    title: "Project Management App (ClickUp-Based)",
    text: "Plan the project, assign each task, and keep the team working from the same board. Built on ClickUp so planning stays with the work.",
    url: "http://localhost:8080/",
    image: img_projects,
  },
  {
    id: "indiq",
    title: "INDIQ 4.0 – AI Manufacturing Intelligence",
    text: "Digitize drawings, extract characteristics with AI, and connect machines over IoT. Quality data feeds back into the process so the loop stays closed.",
    url: "",
    image: img_indiq,
  },
]

if (import.meta.hot) {
  import.meta.hot.accept()
}
