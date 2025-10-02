"use client"

import { Link, useLocation, useNavigate } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "../../contexts/auth-context"
import { useUser } from "../../contexts/user-context"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar"
import { Badge } from "../ui/badge"
import { Separator } from "../ui/separator"
import { 
  LogOut, 
  User, 
  Stethoscope, 
  Building2, 
  Shield, 
  Settings, 
  Bell, 
  ChevronDown,
  Search,
  HelpCircle,
  UserCircle,
  Palette,
  Zap,
  Activity
} from "lucide-react"
import sidebarConfig from "./sidebarConfig"
import { pacienteService } from "../../services/pacienteService"

// Sidebar unificada por role com design moderno e tema escuro
export function Sidebar({ role = "paciente" }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout: authLogout } = useAuth()
  const { logout: userLogout } = useUser()

  const isAdmin = user?.role === "admin" || user?.tipo === "admin"

  const config = sidebarConfig[role] || sidebarConfig.paciente

  // Estados para funcionalidades da sidebar
  const [searchQuery, setSearchQuery] = useState("")
  const [notifications, setNotifications] = useState(3) // Simulando notificações
  const [isSearchFocused, setIsSearchFocused] = useState(false)

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

  // Filtrar itens de menu baseado na pesquisa
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return config.sections || []
    
    return config.sections?.map(section => ({
      ...section,
      items: section.items?.filter(item => 
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      ) || []
    })).filter(section => section.items.length > 0) || []
  }, [config.sections, searchQuery])

  const secondaryLine = cpf || patient?.plano_saude || user?.email || ""

  return (
    <UISidebar variant="floating" className={cn("bg-gradient-to-b from-slate-900 to-slate-950 border-slate-800 text-white shadow-2xl")}>
      {/* Header Moderno com Gradiente */}
      <SidebarHeader className="border-b border-slate-800/50 bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-4">
          <Link to={homePath} className="flex items-center gap-3 group">
            <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 text-white shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300 group-hover:scale-105">
              <HeaderIcon className="size-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-white text-lg group-hover:text-blue-200 transition-colors">Portal Médico</span>
              <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">{headerSubtitle}</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="relative text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200 hover:scale-105"
            >
              <Bell className="size-4" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 size-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                  {notifications}
                </span>
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200 hover:scale-105"
            >
              <HelpCircle className="size-4" />
            </Button>
          </div>
        </div>
        
        {/* Barra de Pesquisa */}
        <div className="px-4 pb-4">
          <div className={cn(
            "relative transition-all duration-300",
            isSearchFocused && "transform scale-[1.02]"
          )}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Pesquisar no menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className={cn(
                "pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400",
                "focus:bg-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
                "transition-all duration-300"
              )}
            />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-gradient-to-b from-slate-900 to-slate-950">
        {filteredSections?.map((section, idx) => (
          <SidebarGroup key={`${section.label}-${idx}`} className="px-3 py-2">
            {section.label && (
              <SidebarGroupLabel className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                <Activity className="size-3" />
                {section.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {(section.items || []).map((item, itemIdx) => {
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/")
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton 
                        asChild 
                        data-active={isActive}
                        className={cn(
                          "group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300",
                          "text-slate-300 hover:text-white hover:bg-gradient-to-r hover:from-slate-800/50 hover:to-slate-700/50",
                          "hover:shadow-lg hover:shadow-slate-900/20 hover:scale-[1.02] hover:translate-x-1",
                          isActive && "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/30 scale-[1.02] translate-x-1"
                        )}
                        style={{
                          animationDelay: `${itemIdx * 50}ms`
                        }}
                      >
                        <Link to={item.path} className="flex items-center gap-3 w-full">
                          {Icon && (
                            <div className={cn(
                              "p-1.5 rounded-lg transition-all duration-300",
                              isActive ? "bg-white/20" : "bg-slate-800/50 group-hover:bg-slate-700/50"
                            )}>
                              <Icon className="size-4 flex-shrink-0" />
                            </div>
                          )}
                          <span className="font-medium">{item.label}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="ml-auto bg-slate-700 text-slate-200 text-xs animate-pulse">
                              {item.badge}
                            </Badge>
                          )}
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
          <SidebarGroup className="px-3 py-2">
            <SidebarGroupLabel className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield className="size-3" />
              Telas Administrativas
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {adminTelas.map((item, itemIdx) => {
                  const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/")
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton 
                        asChild 
                        data-active={isActive}
                        className={cn(
                          "group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300",
                          "text-slate-300 hover:text-white hover:bg-gradient-to-r hover:from-amber-800/30 hover:to-amber-700/30",
                          "hover:shadow-lg hover:shadow-amber-900/20 hover:scale-[1.02] hover:translate-x-1",
                          isActive && "bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-600/30 scale-[1.02] translate-x-1"
                        )}
                        style={{
                          animationDelay: `${itemIdx * 50}ms`
                        }}
                      >
                        <Link to={item.href} className="flex items-center gap-3 w-full">
                          {Icon && (
                            <div className={cn(
                              "p-1.5 rounded-lg transition-all duration-300",
                              isActive ? "bg-white/20" : "bg-slate-800/50 group-hover:bg-amber-700/30"
                            )}>
                              <Icon className="size-4 flex-shrink-0" />
                            </div>
                          )}
                          <span className="font-medium">{item.title}</span>
                          <Badge variant="outline" className="ml-auto border-amber-500/50 text-amber-400 text-xs">
                            Admin
                          </Badge>
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

      {/* Footer Moderno com Perfil do Usuário */}
      <SidebarFooter className="border-t border-slate-800/50 bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-xl">
        {/* Perfil do Usuário com Dropdown */}
        <div className="px-4 py-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-800/50 to-slate-700/50 hover:from-slate-800 hover:to-slate-700 transition-all duration-300 cursor-pointer group hover:shadow-lg hover:shadow-slate-900/20 hover:scale-[1.02]">
                <Avatar className="size-10 ring-2 ring-slate-700 group-hover:ring-blue-500/50 transition-all duration-300">
                  <AvatarImage src={avatarSrc} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 text-white font-semibold">
                    {(displayName || "U")?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0.5 leading-tight flex-1 min-w-0">
                  <span className="text-sm font-semibold text-white truncate group-hover:text-blue-200 transition-colors">
                    {displayName}
                  </span>
                  <span className="text-xs text-slate-400 truncate group-hover:text-slate-300 transition-colors">
                    {secondaryLine}
                  </span>
                </div>
                <ChevronDown className="size-4 text-slate-400 group-hover:text-white transition-all duration-300 group-hover:rotate-180" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-56 bg-slate-800 border-slate-700 text-white shadow-2xl"
            >
              <DropdownMenuLabel className="text-slate-300">Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem className="hover:bg-slate-700 focus:bg-slate-700 cursor-pointer">
                <UserCircle className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="hover:bg-slate-700 focus:bg-slate-700 cursor-pointer"
                onClick={() => {
                  const basePath = location.pathname.split('/')[1] // pega 'paciente', 'medico', etc
                  navigate(`/${basePath}/configuracoes`)
                }}
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem 
                className="hover:bg-red-900/50 focus:bg-red-900/50 cursor-pointer text-red-400"
                onClick={async () => {
                  try { await authLogout() } finally { userLogout?.(); navigate("/login") }
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair da Conta</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator className="bg-slate-800/50" />

        {/* Status e Ações Rápidas */}
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="size-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Online</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="size-3" />
              <span>v2.1.0</span>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </UISidebar>
  )
}

export default Sidebar