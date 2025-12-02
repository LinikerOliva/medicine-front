import { SidebarProvider, SidebarInset } from "../components/ui/sidebar"
import { ThemeToggle } from "../components/theme-toggle"
import { useUser } from "@/contexts/user-context"
import { useAuth } from "@/contexts/auth-context"
import { Separator } from "../components/ui/separator"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar"
import { cn } from "@/lib/utils"
import { Bell, Search, ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../components/ui/breadcrumb"
import { SidebarTrigger } from "../components/ui/sidebar"

export function DashboardLayout({ children, sidebar: Sidebar, breadcrumbs = [] }) {
  const { activeRole } = useUser()
  const { user } = useAuth()
  const { userData } = useUser()
  const navigate = useNavigate()
  
  const displayName = userData?.nome || user?.nome || "Usuário"

  const handleBack = () => {
    const fallback = (() => {
      const r = (activeRole || user?.role || user?.tipo || "").toLowerCase()
      if (r === "medico") return "/medico/dashboard"
      if (r === "paciente") return "/paciente/perfil"
      if (r === "clinica") return "/clinica/dashboard"
      if (r === "secretaria") return "/secretaria/dashboard"
      if (r === "admin") return "/admin/dashboard"
      return "/inicio"
    })()
    try {
      if (window.history.length > 1) navigate(-1)
      else navigate(fallback, { replace: true })
    } catch {
      navigate(fallback, { replace: true })
    }
  }

  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset>
        {/* Header Moderno */}
        <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-4 px-6">
            <Button variant="ghost" size="sm" onClick={handleBack} className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
              <ArrowLeft className="size-4" />
            </Button>
            <SidebarTrigger className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100" />
            <Separator orientation="vertical" className="h-6 bg-slate-200 dark:bg-slate-700" />
            
            {/* Breadcrumb */}
            {breadcrumbs.length > 0 && (
              <Breadcrumb className="flex-1">
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, index) => (
                    <div key={index} className="flex items-center">
                      {index > 0 && <BreadcrumbSeparator className="text-slate-400" />}
                      <BreadcrumbItem>
                        {crumb.href ? (
                          <BreadcrumbLink 
                            href={crumb.href}
                            className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 font-medium"
                          >
                            {crumb.label}
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage className="text-slate-900 dark:text-slate-100 font-semibold">
                            {crumb.label}
                          </BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                    </div>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            )}

            {/* Search Bar */}
            <div className="relative hidden md:flex items-center max-w-sm">
              <Search className="absolute left-3 size-4 text-slate-400" />
              <Input
                placeholder="Buscar..."
                className="pl-10 input-medical-primary bg-slate-100 dark:bg-slate-800"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  try {
                    const r = (activeRole || user?.role || user?.tipo || '').toLowerCase()
                    if (r === 'paciente') navigate('/paciente/dashboard')
                    else navigate('/paciente/dashboard')
                  } catch {
                    navigate('/paciente/dashboard')
                  }
                }}
                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                <Bell className="size-4" />
              </Button>
              <ThemeToggle />
              <Separator orientation="vertical" className="h-6 bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-2">
                <Avatar className="size-8">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-semibold">
                    {displayName?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:block">
                  {displayName}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 min-h-[calc(100vh-4rem)]">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default DashboardLayout
