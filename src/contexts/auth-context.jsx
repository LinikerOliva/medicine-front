"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { authService } from "../services/authService"

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      try {
        // tenta obter usuário atual (normalizado) do storage/api
        const currentUser = authService.getCurrentUser()
        if (currentUser) {
          setUser(currentUser)
        } else {
          // como fallback, tenta refresh do backend
          const refreshed = await authService.refreshCurrentUser().catch(() => null)
          if (refreshed?.user) setUser(refreshed.user)
        }
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (credentials) => {
    const data = await authService.login(credentials)
    if (data?.user) {
      setUser(data.user)
    } else {
      // fallback: tenta ler do localStorage
      const currentUser = authService.getCurrentUser()
      setUser(currentUser)
    }
    return data
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
  }

  const register = async (userData) => {
    const data = await authService.register(userData)
    if (data?.user) {
      setUser(data.user)
    } else {
      // como fallback, tenta ler do localStorage
      const currentUser = authService.getCurrentUser()
      if (currentUser) setUser(currentUser)
    }
    return data
  }

  const loginWithGoogle = async (credential) => {
    const data = await authService.loginWithGoogle(credential)
    setUser(data.user)
    return data
  }

  const value = {
    user,
    login,
    logout,
    register,
    loading,
    // considera user OU token no localStorage para evitar falso negativo
    isAuthenticated: !!user || authService.isAuthenticated(),
    loginWithGoogle,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider")
  }
  return context
}
