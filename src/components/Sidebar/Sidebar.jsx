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
import { Badge, PatientStatusBadge } from "../ui/badge"
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
  Activity,
  Heart,
  Plus,
  Calendar,
  Clock
} from "lucide-react"
import sidebarConfig from "./sidebarConfig"
import { pacienteService } from "../../services/pacienteService"

// Sidebar médica profissional com hierarquia visual clara
export function Sidebar({ role = "paciente" }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout: authLogout } = useAuth()
  const { logout: userLogout } = useUser()

  const isAdmin = user?.role === "admin" || user?.tipo === "admin"
  const config = sidebarConfig[role] || sidebarConfig.paciente

  // Estados para funcionalidades da sidebar
  const [searchQuery, setSearchQuery] = useState("")
  const [notifications, setNotifications] = useState(3)
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

  // Telas de atalho visíveis apenas para administradores
  const adminTelas = [
    { title: "Paciente", path: "/paciente/perfil", icon: User },
    { title: "Médico", path: "/medico/dashboard", icon: Stethoscope },
    { title: "Clínica", path: "/clinica/dashboard", icon: Building2 },
    { title: "Secretaria", path: "/secretaria/dashboard", icon: UserCircle },
    { title: "Admin", path: "/admin/dashboard", icon: Shield },
  ]

  // Função de logout
  const handleLogout = async () => {
    try {
      await authLogout()
      await userLogout()
      navigate("/login")
    } catch (error) {
      console.error("Erro ao fazer logout:", error)
    }
  }

  // Informações do usuário para exibição
  const displayName = useMemo(() => {
    if (loadingPatient) return "Carregando..."
    if (role === "paciente" && patient) return patient.nome || "Paciente"
    return user?.nome || user?.name || "Usuário"
  }, [user, patient, loadingPatient, role])

  const secondaryLine = useMemo(() => {
    if (loadingPatient) return "..."
    if (role === "paciente" && patient) {
      return patient.cpf ? `CPF: ${patient.cpf}` : "Paciente"
    }
    return user?.email || config.header.subtitle
  }, [user, patient, loadingPatient, role, config])

  const avatarSrc = useMemo(() => {
    if (role === "paciente" && patient?.foto) return patient.foto
    return user?.avatar || user?.foto || null
  }, [user, patient, role])

  // Ícone do role atual
  const RoleIcon = config.header.icon

  return (
    <UISidebar className="medical-sidebar group border-r border-medical-border/20 bg-gradient-to-b from-medical-background to-medical-background/95 backdrop-blur-xl">
      {/* Header Médico Profissional */}
      <SidebarHeader className="border-b border-medical-border/10 bg-gradient-to-r from-medical-primary/5 to-medical-secondary/5 p-6">
        {/* Logo e Branding Médico */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-medical-primary to-medical-secondary shadow-lg">
            <Heart className="size-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-medical-primary bg-gradient-to-r from-medical-primary to-medical-secondary bg-clip-text text-transparent">
              {config.header.title}
            </h1>
            <div className="flex items-center gap-2">
              <RoleIcon className="size-3 text-medical-secondary" />
              <span className="text-xs font-medium text-medical-secondary uppercase tracking-wider">
                {config.header.subtitle}
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Pesquisa Médica */}
        <div className="relative">
          <Search className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 size-4 transition-colors duration-200",
            isSearchFocused ? "text-medical-primary" : "text-muted-foreground"
          )} />
          <Input
            placeholder="Buscar pacientes, exames..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className={cn(
              "pl-10 pr-4 h-10 bg-medical-background/50 border-medical-border/30",
              "focus:border-medical-primary/50 focus:ring-medical-primary/20",
              "placeholder:text-muted-foreground/70"
            )}
          />
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="btn-medical-ghost"
              className="h-8 px-3 text-xs"
            >
              <Plus className="size-3 mr-1" />
              Novo
            </Button>
            <Button
              size="sm"
              variant="btn-medical-ghost"
              className="h-8 px-3 text-xs"
            >
              <Calendar className="size-3 mr-1" />
              Agenda
            </Button>
          </div>
          
          {/* Notificações Médicas */}
          <Button
            size="sm"
            variant="ghost"
            className="relative h-8 w-8 p-0 hover:bg-medical-primary/10"
          >
            <Bell className="size-4" />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 size-4 bg-medical-red text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                {notifications}
              </span>
            )}
          </Button>
        </div>
      </SidebarHeader>

      {/* Conteúdo da Navegação */}
      <SidebarContent className="px-3 py-4 space-y-6">
        {/* Status do Paciente (apenas para role paciente) */}
        {role === "paciente" && patient && (
          <div className="px-3 py-4 rounded-xl bg-gradient-to-r from-medical-primary/5 to-medical-secondary/5 border border-medical-border/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-medical-primary">Status do Paciente</span>
              <PatientStatusBadge status="active" size="sm" />
            </div>
            <div className="text-xs text-muted-foreground">
              Última consulta: {new Date().toLocaleDateString()}
            </div>
          </div>
        )}

        {/* Menu de Navegação por Seções */}
        {config.sections.map((section, idx) => (
          <SidebarGroup key={`${section.label}-${idx}`} className="space-y-3">
            {section.label && (
              <SidebarGroupLabel className="text-medical-secondary/80 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 px-3">
                <Activity className="size-3" />
                {section.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {(section.items || []).map((item, itemIdx) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  
                  return (
                    <SidebarMenuItem key={`${item.label}-${itemIdx}`}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={cn(
                          "group relative h-11 px-3 rounded-xl transition-all duration-200",
                          "hover:bg-medical-primary/10 hover:shadow-sm",
                          isActive && [
                            "bg-gradient-to-r from-medical-primary/15 to-medical-secondary/10",
                            "border-l-4 border-medical-primary shadow-sm",
                            "text-medical-primary font-medium"
                          ]
                        )}
                      >
                        <Link to={item.path} className="flex items-center gap-3 w-full">
                          {Icon && (
                            <div className={cn(
                              "flex items-center justify-center size-8 rounded-lg transition-all duration-200",
                              isActive 
                                ? "bg-medical-primary/20 text-medical-primary" 
                                : "bg-medical-background/50 text-muted-foreground group-hover:bg-medical-primary/10 group-hover:text-medical-primary"
                            )}>
                              <Icon className="size-4" />
                            </div>
                          )}
                          <span className="font-medium flex-1">{item.label}</span>
                          {item.badge && (
                            <Badge 
                              variant="medical-secondary" 
                              size="sm"
                              className="ml-auto animate-pulse"
                            >
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

        {/* Seção Administrativa (apenas para admins) */}
        {isAdmin && role !== "admin" && (
          <SidebarGroup className="space-y-3">
            <SidebarGroupLabel className="text-amber-600/80 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 px-3">
              <Shield className="size-3" />
              Acesso Administrativo
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {adminTelas.map((item, itemIdx) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  
                  return (
                    <SidebarMenuItem key={`admin-${item.title}-${itemIdx}`}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={cn(
                          "group relative h-11 px-3 rounded-xl transition-all duration-200",
                          "hover:bg-amber-500/10 hover:shadow-sm",
                          isActive && [
                            "bg-gradient-to-r from-amber-500/15 to-orange-500/10",
                            "border-l-4 border-amber-500 shadow-sm",
                            "text-amber-600 font-medium"
                          ]
                        )}
                      >
                        <Link to={item.path} className="flex items-center gap-3 w-full">
                          {Icon && (
                            <div className={cn(
                              "flex items-center justify-center size-8 rounded-lg transition-all duration-200",
                              isActive 
                                ? "bg-amber-500/20 text-amber-600" 
                                : "bg-amber-50 text-amber-600/70 group-hover:bg-amber-500/10 group-hover:text-amber-600"
                            )}>
                              <Icon className="size-4" />
                            </div>
                          )}
                          <span className="font-medium flex-1">{item.title}</span>
                          <Badge 
                            variant="warning" 
                            size="sm"
                            className="ml-auto"
                          >
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

      {/* Footer Médico Profissional */}
      <SidebarFooter className="border-t border-medical-border/20 bg-gradient-to-r from-medical-background/80 to-medical-background/60 backdrop-blur-xl p-4">
        {/* Perfil do Usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-medical-background/50 to-medical-background/30 hover:from-medical-primary/5 hover:to-medical-secondary/5 transition-all duration-300 cursor-pointer group hover:shadow-lg border border-medical-border/10 hover:border-medical-primary/20">
              <Avatar className="size-10 ring-2 ring-medical-border/20 group-hover:ring-medical-primary/30 transition-all duration-300">
                <AvatarImage src={avatarSrc} />
                <AvatarFallback className="bg-gradient-to-br from-medical-primary via-medical-secondary to-medical-accent text-white font-semibold">
                  {(displayName || "U")?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 leading-tight flex-1 min-w-0">
                <span className="text-sm font-semibold text-medical-primary truncate group-hover:text-medical-primary/80 transition-colors">
                  {displayName}
                </span>
                <span className="text-xs text-muted-foreground truncate group-hover:text-medical-secondary transition-colors">
                  {secondaryLine}
                </span>
              </div>
              <ChevronDown className="size-4 text-muted-foreground group-hover:text-medical-primary transition-all duration-300 group-hover:rotate-180" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-64 bg-medical-background/95 backdrop-blur-xl border-medical-border/20"
          >
            <DropdownMenuLabel className="text-medical-primary font-semibold">
              Minha Conta
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-medical-border/20" />
            <DropdownMenuItem className="hover:bg-medical-primary/10 focus:bg-medical-primary/10">
              <User className="size-4 mr-2 text-medical-primary" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => navigate(`/${role}/configuracoes`)}
              className="hover:bg-medical-primary/10 focus:bg-medical-primary/10"
            >
              <Settings className="size-4 mr-2 text-medical-primary" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-medical-primary/10 focus:bg-medical-primary/10">
              <Palette className="size-4 mr-2 text-medical-primary" />
              Tema
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-medical-primary/10 focus:bg-medical-primary/10">
              <HelpCircle className="size-4 mr-2 text-medical-primary" />
              Ajuda
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-medical-border/20" />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-medical-red hover:bg-medical-red/10 focus:bg-medical-red/10"
            >
              <LogOut className="size-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator className="bg-medical-border/20" />

        {/* Status e Informações do Sistema */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="size-2 bg-medical-green rounded-full animate-pulse"></div>
            <span>Sistema Online</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="size-3" />
            <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </SidebarFooter>
    </UISidebar>
  )
}

export default Sidebar