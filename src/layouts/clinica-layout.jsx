import { Outlet } from "react-router-dom"
import DashboardLayout from "./dashboard-layout"
import { Sidebar as UnifiedSidebar } from "../components/Sidebar/Sidebar"

export function ClinicaLayout({ breadcrumbs }) {
  const SidebarWithRole = () => <UnifiedSidebar role="clinica" />
  return (
    <DashboardLayout sidebar={SidebarWithRole} breadcrumbs={breadcrumbs}>
      <Outlet />
    </DashboardLayout>
  )
}

export default ClinicaLayout
