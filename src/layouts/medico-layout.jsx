// MedicoLayout()
import { Outlet } from "react-router-dom"
import DashboardLayout from "./dashboard-layout"
import { Sidebar as UnifiedSidebar } from "../components/Sidebar/Sidebar"

function MedicoLayout() {
  const SidebarWithRole = () => <UnifiedSidebar role="medico" />
  return (
    <DashboardLayout sidebar={SidebarWithRole}>
      <Outlet />
    </DashboardLayout>
  )
}

export default MedicoLayout
