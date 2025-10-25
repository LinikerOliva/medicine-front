"use client"

import { createContext, useContext, useState, useCallback, useMemo } from "react"

const UserContext = createContext(undefined)

export function UserProvider({ children }) {
  const [activeRole, setActiveRole] = useState("paciente")
  const [isAuthenticated, setIsAuthenticated] = useState(false) // Mudei para false por padrão
  const [userPermissions, setUserPermissions] = useState({
    isMedico: false,
    isAdmin: false,
    isClinica: false,
    medicoStatus: "none", // none, pending, approved, rejected
  })
  // Ephemeral certificado para assinatura (não persistir)
  const [ephemeralCertFile, setEphemeralCertFile] = useState(null)
  const [ephemeralCertPassword, setEphemeralCertPassword] = useState("")
  const clearEphemeralCert = useCallback(() => {
    setEphemeralCertFile(null)
    setEphemeralCertPassword("")
  }, [])

  const toggleRole = useCallback(() => {
    // Só permite alternar se o usuário tem permissão de médico
    if (userPermissions.isMedico && userPermissions.medicoStatus === "approved") {
      setActiveRole(activeRole === "medico" ? "paciente" : "medico")
    }
  }, [userPermissions.isMedico, userPermissions.medicoStatus, activeRole])

  const login = useCallback((role = "paciente", permissions = {}) => {
    setIsAuthenticated(true)
    setActiveRole(role)
    setUserPermissions(permissions)
  }, [])

  const logout = useCallback(() => {
    setIsAuthenticated(false)
    setActiveRole("paciente")
    setUserPermissions({
      isMedico: false,
      isAdmin: false,
      isClinica: false,
      medicoStatus: "none",
    })
    clearEphemeralCert()
  }, [clearEphemeralCert])

  const contextValue = useMemo(() => ({
    activeRole,
    setActiveRole,
    toggleRole,
    isAuthenticated,
    userPermissions,
    setUserPermissions,
    login,
    logout,
    // Ephemeral certificado
    ephemeralCertFile,
    setEphemeralCertFile,
    ephemeralCertPassword,
    setEphemeralCertPassword,
    clearEphemeralCert,
  }), [
    activeRole,
    toggleRole,
    isAuthenticated,
    userPermissions,
    login,
    logout,
    ephemeralCertFile,
    ephemeralCertPassword,
    clearEphemeralCert,
  ])

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
