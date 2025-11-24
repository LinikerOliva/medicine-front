"use client"

import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"

export default function RequireAdmin({ children }) {
  const { user, isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return null

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Token válido mas usuário ainda não carregado: não bloquear
  if (!user) return children

  const role = user?.role || user?.tipo

  if (role !== "admin") {
    if (role === "paciente") return <Navigate to="/paciente/perfil" replace />
    if (role === "medico") return <Navigate to="/medico/dashboard" replace />
    if (role === "clinica") return <Navigate to="/clinica/dashboard" replace />
    return <Navigate to="/" replace />
  }

  return children
}