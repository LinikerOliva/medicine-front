"use client"

import { Link, useLocation, useNavigate } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "../../contexts/auth-context"
import { useUser } from "../../contexts/user-context"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import {
  Sidebar as UISidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "../ui/sidebar"
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar"
import { ThemeToggle } from "../theme-toggle"
import { LogOut, User, Stethoscope, Building2, Shield } from "lucide-react"
import sidebarConfig from "./sidebarConfig"
import { pacienteService } from "../../services/pacienteService"

// Sidebar unificada por role
export function Sidebar({ role = "paciente" }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout: authLogout } = useAuth()
  const { logout: userLogout } = useUser()

  const isAdmin = user?.role === "admin" || user?.tipo === "admin"

  const config = sidebarConfig[role] || sidebarConfig.paciente

  // Carregar dados do paciente apenas quando role === "paciente"
  const [patient, setPatient] = useState(null)
  const [loadingPatient, setLoadingPatient] = useState(role === "paciente")

  useEffect(() => {
    let mounted = true
    if (role !== "paciente") {
      setPatient(null)
      setLoadingPatient(false)
      return
    }
    ;(async () => {
      try {
        const p = await pacienteService.getPacienteDoUsuario()
        if (mounted) setPatient(p || null)
      } catch (_) {
        if (mounted) setPatient(null)
      } finally {
        if (mounted) setLoadingPatient(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [role])

  // Telas de atalho visíveis apenas para administradores (independente da role atual)
  const adminTelas = [
    { title: "Paciente", href: "/paciente/perfil", icon: User },
    { title: "Médico", href: "/medico/dashboard", icon: Stethoscope },
    { title: "Clínica", href: "/clinica/dashboard", icon: Building2 },
    { title: "Admin", href: "/admin/dashboard", icon: Shield },
  ]

  // Dados para o header e avatar
  const HeaderIcon = config.header?.icon || User
  const headerSubtitle = config.header?.subtitle || "Portal"
  const homePath = (config.sections?.[0]?.items?.[0]?.path) || "/"

  const avatarSrc =
    (patient?.foto_url || patient?.foto) ||
    user?.avatar || user?.avatar_url || "/placeholder.svg"

  const displayName = useMemo(() => {
    const composedPatient =
      [
        patient?.user?.display_name,
        [patient?.user?.first_name || patient?.first_name, patient?.user?.last_name || patient?.last_name]
          .filter(Boolean)
          .join(" ")
          .trim(),
      ]
        .filter(Boolean)
        .shift()

    return (
      patient?.nome ||
      patient?.display_name ||
      composedPatient ||
      user?.display_name ||
      user?.nome ||
      [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
      user?.name ||
      "Usuário"
    )
  }, [patient, user])

  const cpf = useMemo(() => {
    return (
      patient?.cpf ||
      patient?.user?.cpf ||
      user?.cpf ||
      user?.profile?.cpf ||
      ""
    )
  }, [patient, user])

  const secondaryLine = cpf || patient?.plano_saude || user?.email || ""

  return (
    <UISidebar variant="floating" className={cn("sidebar-green")}> {/* mantém o tema atual */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-between px-2 py-2">
          <Link to={homePath} className="flex items-center gap-2">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HeaderIcon className="size-4" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-semibold">Portal Médico</span>
              <span className="text-xs text-muted-foreground">{headerSubtitle}</span>
            </div>
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {config.sections?.map((section, idx) => (
          <SidebarGroup key={`${section.label}-${idx}`}>
            {section.label && <SidebarGroupLabel>{section.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {(section.items || []).map((item) => {
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/")
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild data-active={isActive}>
                        <Link to={item.path} className="flex items-center gap-2">
                          {Icon && <Icon className="size-4" />}
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {isAdmin && role !== "admin" && (
         <SidebarGroup>
            <SidebarGroupLabel>Telas</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminTelas.map((item) => {
                  const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/")
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild data-active={isActive}>
                        <Link to={item.href} className="flex items-center gap-2">
                          {Icon && <Icon className="size-4" />}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <Avatar className="size-8">
            <AvatarImage src={avatarSrc} />
            <AvatarFallback>{(displayName || "U")?.charAt(0)?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5 leading-none flex-1 min-w-0">
            <span className="text-sm font-medium truncate">{displayName}</span>
            <span className="text-xs text-muted-foreground truncate">{secondaryLine}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              try { await authLogout() } finally { userLogout?.(); navigate("/login") }
            }}
            className="text-xs"
            title="Sair"
          >
            <LogOut className="mr-1.5 h-4 w-4" />
            Sair
          </Button>
        </div>
        <div className="px-2 py-1 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Tema</span>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </UISidebar>
  )
}

export default Sidebar