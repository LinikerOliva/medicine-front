import { Outlet } from "react-router-dom"
import DashboardLayout from "./dashboard-layout"
import { Sidebar as UnifiedSidebar } from "../components/Sidebar/Sidebar"
import { useLocation } from "react-router-dom"
import { useMemo } from "react"
import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { pacienteService } from "@/services/pacienteService"

function PacienteLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  // Busca do perfil para validar campos obrigatórios
  const [profile, setProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const revalidatingRef = useRef(false)

  // Busca/atualiza o perfil
  const refreshProfile = async () => {
    try {
      const data = await pacienteService.getPerfil()
      setProfile(data)
    } catch (e) {
      // Em caso de 401 ou erro, não redireciona em loop; apenas libera a rota.
    } finally {
      setLoadingProfile(false)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!mounted) return
      setLoadingProfile(true)
      await refreshProfile()
    })()
    return () => {
      mounted = false
    }
  }, [])

  const isIncomplete =
    !!profile &&
    (!profile?.data_nascimento || !profile?.endereco || !profile?.telefone)

  // Revalida o perfil sempre que tentar navegar para outra rota
  useEffect(() => {
    let active = true
    ;(async () => {
      // Se está saindo da página de perfil, revalida antes de decidir bloquear
      if (location.pathname !== "/paciente/perfil") {
        revalidatingRef.current = true
        setLoadingProfile(true)
        await refreshProfile()
        revalidatingRef.current = false
      }
    })()
    return () => {
      active = false
    }
  }, [location.pathname])

  useEffect(() => {
    // Evita redirecionar enquanto está revalidando
    if (revalidatingRef.current) return
    if (!loadingProfile && isIncomplete && location.pathname !== "/paciente/perfil") {
      navigate("/paciente/perfil", { replace: true })
    }
  }, [loadingProfile, isIncomplete, location.pathname, navigate])

  const breadcrumbs = useMemo(() => {
    const path = location.pathname
    const labels = {
      "/paciente/perfil": "Perfil",
      "/paciente/prontuario": "Prontuário",
      "/paciente/consultas": "Consultas",
      "/paciente/exames": "Exames",
      "/paciente/receitas": "Receitas",
      "/paciente/historico-medico": "Histórico Médico",
      "/paciente/medicos": "Médicos Vinculados",
      "/paciente/configuracoes": "Configurações",
    }

    const active =
      labels[path] ||
      (Object.keys(labels).find((k) => path.startsWith(k)) && labels[Object.keys(labels).find((k) => path.startsWith(k))]) ||
      "Perfil"

    // Breadcrumbs básicos (pode expandir depois se tiver subrotas)
    return [
      { label: "Área do Paciente", href: "/paciente/perfil" },
      { label: active },
    ]
  }, [location.pathname])

  const SidebarWithRole = () => <UnifiedSidebar role="paciente" />

  return (
    <DashboardLayout sidebar={SidebarWithRole} breadcrumbs={breadcrumbs}>
      <Outlet />
    </DashboardLayout>
  )
}

export default PacienteLayout
