"use client"

import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { useUser } from "@/contexts/user-context"

export default function RequireMedico({ children }) {
  const { user, isAuthenticated, loading } = useAuth()
  const location = useLocation()
  const { userPermissions } = useUser()

  if (loading) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const role = user?.role || user?.tipo
  const isApprovedMedico = userPermissions?.medicoStatus === "approved"

  // Permite médico OU admin (e também quem tiver status de médico aprovado no contexto)
  if (role !== "medico" && role !== "admin" && !isApprovedMedico) {
    if (role === "paciente") return <Navigate to="/paciente/perfil" replace />
    if (role === "clinica") return <Navigate to="/clinica/dashboard" replace />
    return <Navigate to="/" replace />
  }

  return children
}