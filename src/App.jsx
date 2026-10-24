import { ConfigProvider } from 'antd'
import { AuthProvider } from './auth'
import Customers from './components/Customers'
import EmployeeAccess from './components/EmployeeAccess'
import Home from './components/Home'
import SiteHeader from './components/SiteHeader'
import SmoothRoot from './components/SmoothRoot'
import Solutions from './components/Solutions'

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          fontFamily: "'Source Sans 3 Variable', 'Source Sans 3', 'Segoe UI', sans-serif",
          colorPrimary: '#1b6fbf',
          borderRadius: 6,
        },
        components: {
          Modal: {
            titleFontSize: 18,
          },
        },
      }}
      form={{
        requiredMark: (label, info) =>
          info.required ? (
            <>
              <span className="mr-1 text-rose-600">*</span>
              {label}
            </>
          ) : (
            label
          ),
      }}
    >
      <AuthProvider>
        <SmoothRoot>
          <div className="site-shell">
            <SiteHeader />
            <div className="flex min-h-[calc(100dvh-4.5rem)] flex-col max-[380px]:min-h-0">
              <Home />
              <Customers />
            </div>
            <Solutions />
            <EmployeeAccess />
          </div>
        </SmoothRoot>
      </AuthProvider>
    </ConfigProvider>
  )
}

export default App
