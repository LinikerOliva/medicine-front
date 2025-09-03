"use client"

import { createContext, useContext, useState } from "react"

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

  const toggleRole = () => {
    // Só permite alternar se o usuário tem permissão de médico
    if (userPermissions.isMedico && userPermissions.medicoStatus === "approved") {
      setActiveRole(activeRole === "medico" ? "paciente" : "medico")
    }
  }

  const login = (role = "paciente", permissions = {}) => {
    setIsAuthenticated(true)
    setActiveRole(role)
    setUserPermissions(permissions)
  }

  const logout = () => {
    setIsAuthenticated(false)
    setActiveRole("paciente")
    setUserPermissions({
      isMedico: false,
      isAdmin: false,
      isClinica: false,
      medicoStatus: "none",
    })
  }

  return (
    <UserContext.Provider
      value={{
        activeRole,
        setActiveRole,
        toggleRole,
        isAuthenticated,
        userPermissions,
        setUserPermissions,
        login,
        logout,
      }}
    >
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
