"use client"

import { useUser } from "@/contexts/user-context"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { User, Stethoscope } from "lucide-react"
import { useNavigate } from "react-router-dom"

export function UserRoleSelector() {
  const { activeRole, toggleRole } = useUser()
  const { user } = useAuth()
  const navigate = useNavigate()

  // Verifica se o usuário logado tem permissão de médico
  const canToggleToDoctor = user?.role === "medico" || user?.is_medico || user?.isMedico || false

  // Não renderiza o botão se o usuário não pode ser médico
  if (!canToggleToDoctor) {
    return null
  }

  const handleToggle = () => {
    toggleRole()

    // Redirecionar para a página inicial do novo perfil
    if (activeRole === "medico") {
      navigate("/paciente/perfil")
    } else {
      navigate("/medico/dashboard")
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleToggle} className="flex items-center gap-2 transition-all duration-200 hover:shadow-md">
      {activeRole === "medico" ? (
        <>
          <User className="h-4 w-4" />
          <span>Mudar para Paciente</span>
        </>
      ) : (
        <>
          <Stethoscope className="h-4 w-4" />
          <span>Mudar para Médico</span>
        </>
      )}
    </Button>
  )
}
