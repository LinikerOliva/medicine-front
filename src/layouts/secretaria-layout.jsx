import { Outlet } from "react-router-dom"
import DashboardLayout from "./dashboard-layout"
import { Sidebar as UnifiedSidebar } from "../components/Sidebar/Sidebar"

function SecretariaLayout() {
  const SidebarWithRole = () => <UnifiedSidebar role="secretaria" />
  return (
    <DashboardLayout sidebar={SidebarWithRole}>
      <Outlet />
    </DashboardLayout>
  )
}

export default SecretariaLayout