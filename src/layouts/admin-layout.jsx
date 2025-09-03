// AdminLayout()
import { Outlet } from "react-router-dom"
import DashboardLayout from "./dashboard-layout"
import { Sidebar as UnifiedSidebar } from "../components/Sidebar/Sidebar"

function AdminLayout() {
  const SidebarWithRole = () => <UnifiedSidebar role="admin" />
  return (
    <DashboardLayout sidebar={SidebarWithRole}>
      <Outlet />
    </DashboardLayout>
  )
}

export default AdminLayout
