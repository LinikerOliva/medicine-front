"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
import { authService } from "../services/authService"
import { useErrorHandler } from "../utils/errorHandler"

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const { handleError } = useErrorHandler()

  const initAuth = useCallback(async () => {
    try {
      // tenta obter usuário atual (normalizado) do storage/api
      const currentUser = authService.getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
      } else if (authService.isAuthenticated()) {
        // Se há token mas não há usuário, tenta buscar da API
        try {
          const refreshedUser = await authService.refreshCurrentUser()
          if (refreshedUser) {
            setUser(refreshedUser)
          } else {
            // Falha não-401 (404, 500, etc): mantém token e libera app
            // O usuário será carregado sob demanda quando algum endpoint de perfil estiver disponível
          }
        } catch (error) {
          // Não executar logout em 401 durante bootstrap: preserva token
          // Isso evita quedas para /login em backends onde /me requer cookie ou tem configuração diferente
          // O fluxo das rotas já permite acesso quando há token válido, mesmo sem user carregado
          setUser(null)
        }
      }
    } catch (error) {
      handleError(error, 'Erro ao inicializar autenticação')
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
