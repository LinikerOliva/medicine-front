import {
  User,
  FileText,
  Calendar,
  ClipboardList,
  History,
  Settings,
  Users,
  LayoutDashboard,
  Search,
  Stethoscope,
  Building2,
  Shield,
  Home,
  Clock,
  FileText as FileTextIcon,
  BarChart3,
  CalendarDays,
  UserCheck,
} from "lucide-react"

// Configuração de menus por perfil
// Cada seção tem um label e um array de items { label, path, icon }
export const sidebarConfig = {
  paciente: {
    header: { title: "Trathea", subtitle: "Paciente", icon: User },
    sections: [
      {
        label: "Menu Principal",
        items: [
          { label: "Perfil", path: "/paciente/perfil", icon: User },
          { label: "Prontuário", path: "/paciente/prontuario", icon: FileText },
          { label: "Consultas", path: "/paciente/consultas", icon: Calendar },
          { label: "Exames", path: "/paciente/exames", icon: ClipboardList },
          { label: "Receitas", path: "/paciente/receitas", icon: ClipboardList },
          { label: "Histórico Médico", path: "/paciente/historico-medico", icon: History },
          { label: "Médicos Vinculados", path: "/paciente/medicos", icon: Users },
        ],
      },
    ],
  },
  medico: {
    header: { title: "Trathea", subtitle: "Médico", icon: Stethoscope },
    sections: [
      {
        label: "Menu Principal",
        items: [
          { label: "Dashboard", path: "/medico/dashboard", icon: LayoutDashboard },
          { label: "Consultas de Hoje", path: "/medico/consultas/hoje", icon: Calendar },
          { label: "Meus Pacientes", path: "/medico/meus-pacientes", icon: Users },
          { label: "Solicitações", path: "/medico/solicitacoes", icon: UserCheck },
        ],
      },
    ],
  },
  clinica: {
    header: { title: "Trathea", subtitle: "Clínica", icon: CalendarDays },
    sections: [
      {
        label: "Menu Principal",
        items: [
          { label: "Dashboard", path: "/clinica/dashboard", icon: Home },
          { label: "Calendário", path: "/clinica/calendario", icon: Calendar },
          { label: "Disponibilidade", path: "/clinica/disponibilidade", icon: Clock },
          { label: "Exames", path: "/clinica/exames", icon: FileTextIcon },
          { label: "Pacientes", path: "/clinica/pacientes", icon: Users },
          { label: "Médicos", path: "/clinica/medicos", icon: Stethoscope },
          { label: "Relatórios", path: "/clinica/relatorios", icon: BarChart3 },
        ],
      },
    ],
  },
  secretaria: {
    header: { title: "Trathea", subtitle: "Secretaria", icon: Users },
    sections: [
      {
        label: "Menu Principal",
        items: [
          { label: "Dashboard", path: "/secretaria/dashboard", icon: LayoutDashboard },
          { label: "Consultas", path: "/secretaria/consultas", icon: Calendar },
          { label: "Pacientes", path: "/secretaria/pacientes", icon: Users },
          { label: "Médicos", path: "/secretaria/medicos", icon: Stethoscope },
          { label: "Solicitações", path: "/secretaria/solicitacoes", icon: UserCheck },
        ],
      },
    ],
  },
  admin: {
    header: { title: "Trathea", subtitle: "Admin", icon: Shield },
    sections: [
      {
        label: "Painel",
        items: [
          { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
          { label: "Relatórios", path: "/admin/relatorios", icon: BarChart3 },
          { label: "Auditoria", path: "/admin/auditoria", icon: Shield },
        ],
      },
      {
        label: "Gerenciar",
        items: [
          { label: "Solicitações", path: "/admin/solicitacoes", icon: UserCheck },
          { label: "Usuários", path: "/admin/usuarios", icon: Users },
          { label: "Clínicas", path: "/admin/clinicas", icon: Building2 },
        ],
      },
      {
        label: "Telas",
        items: [
          { label: "Paciente", path: "/paciente/perfil", icon: User },
          { label: "Médico", path: "/medico/dashboard", icon: Stethoscope },
          { label: "Clínica", path: "/clinica/dashboard", icon: Building2 },
          { label: "Secretaria", path: "/secretaria/dashboard", icon: Users },
          { label: "Admin", path: "/admin/dashboard", icon: Shield },
        ],
      },
    ],
  },
}

export default sidebarConfig
