"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
import { authService } from "../services/authService"
import { useErrorHandler } from "../utils/errorHandler"

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const { handleError } = useErrorHandler()

  const redirectToLogin = () => {
    try {
      window.location.href = "/login"
    } catch {}
  }

  const initAuth = useCallback(async () => {
    try {
      // tenta obter usuário atual (normalizado) do storage/api
      const currentUser = authService.getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
      } else if (authService.isAuthenticated()) {
        // Há token mas não há usuário: tenta buscar da API
        try {
          const refreshedUser = await authService.refreshCurrentUser()
          if (refreshedUser) {
            setUser(refreshedUser)
          } else {
            // Qualquer falha ou vazio: força logout e redireciona
            await authService.logout()
            setUser(null)
            redirectToLogin()
          }
        } catch (error) {
          // Em qualquer erro (401, 404, 500), sair e redirecionar
          await authService.logout()
          setUser(null)
          redirectToLogin()
        }
      }
    } catch (error) {
      handleError(error, 'Erro ao inicializar autenticação')
      // Em erro inesperado, garante estado consistente
      try { await authService.logout() } catch {}
      setUser(null)
      redirectToLogin()
    } finally {
      setLoading(false)
    }
  }, [handleError])

  useEffect(() => {
    initAuth()
  }, [])

  const login = useCallback(async (credentials) => {
    try {
      const data = await authService.login(credentials)
      if (data?.user) {
        setUser(data.user)
      } else {
        // fallback: tenta ler do localStorage
        const currentUser = authService.getCurrentUser()
        setUser(currentUser)
      }
      return data
    } catch (error) {
      handleError(error, 'Erro ao fazer login')
      throw error
    }
  }, [handleError])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
      setUser(null)
    } catch (error) {
      handleError(error, 'Erro ao fazer logout')
      // Mesmo com erro, limpa o usuário local
      setUser(null)
    }
  }, [handleError])

  const register = useCallback(async (userData) => {
    try {
      const data = await authService.register(userData)
      if (data?.user) {
        setUser(data.user)
      } else {
        // como fallback, tenta ler do localStorage
        const currentUser = authService.getCurrentUser()
        if (currentUser) setUser(currentUser)
      }
      return data
    } catch (error) {
      handleError(error, 'Erro ao registrar usuário')
      throw error
    }
  }, [handleError])

  const loginWithGoogle = useCallback(async (credential) => {
    try {
      const data = await authService.loginWithGoogle(credential)
      setUser(data.user)
      return data
    } catch (error) {
      handleError(error, 'Erro ao fazer login com Google')
      throw error
    }
  }, [handleError])

  const hasToken = useMemo(() => authService.isAuthenticated(), [user])

  const value = useMemo(() => ({
    user,
    login,
    logout,
    register,
    loading,
    // considera user OU token no localStorage para evitar falso negativo
    isAuthenticated: !!user || hasToken,
    loginWithGoogle,
  }), [user, login, logout, register, loginWithGoogle, hasToken, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider")
  }
  return context
}
