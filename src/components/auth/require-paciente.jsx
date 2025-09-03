"use client"

import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { useEffect, useState } from "react"
import { pacienteService } from "@/services/pacienteService"

export default function RequirePaciente({ children }) {
  const { user, isAuthenticated, loading } = useAuth()
  const location = useLocation()
  const [checkingSecretaria, setCheckingSecretaria] = useState(false)
  const [secretariaHasPatient, setSecretariaHasPatient] = useState(false)

  useEffect(() => {
    let mounted = true
    async function check() {
      if (!isAuthenticated) return
      const role = user?.role || user?.tipo
      if (role === "secretaria") {
        setCheckingSecretaria(true)
        try {
          const p = await pacienteService.getPacienteDoUsuario()
          if (!mounted) return
          setSecretariaHasPatient(!!p?.id)
        } catch (_) {
          if (!mounted) return
          setSecretariaHasPatient(false)
        } finally {
          if (mounted) setCheckingSecretaria(false)
        }
      }
    }
    check()
    return () => {
      mounted = false
    }
  }, [isAuthenticated, user?.role, user?.tipo])

  if (loading || checkingSecretaria) return null

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const role = user?.role || user?.tipo

  // Permite paciente, admin e secretária com perfil de paciente
  if (role !== "paciente" && role !== "admin") {
    if (role === "secretaria" && secretariaHasPatient) {
      return children
    }
    if (role === "medico") return <Navigate to="/medico/dashboard" replace />
    if (role === "clinica") return <Navigate to="/clinica/dashboard" replace />
    return <Navigate to="/" replace />
  }

  return children
}