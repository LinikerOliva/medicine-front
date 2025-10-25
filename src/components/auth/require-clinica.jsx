"use client"

import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"

export default function RequireClinica({ children }) {
  const { user, isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return null

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Token válido, mas usuário não carregado ainda: não bloquear
  if (!user) return children

  const role = user?.role || user?.tipo

  // Permite clínica e admin
  if (role !== "clinica" && role !== "admin") {
    if (role === "paciente") return <Navigate to="/paciente/perfil" replace />
    if (role === "medico") return <Navigate to="/medico/dashboard" replace />
    return <Navigate to="/" replace />
  }

  return children
}