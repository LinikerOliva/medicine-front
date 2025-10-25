/**
 * Sistema centralizado de tratamento de erros
 * Melhora a segurança evitando exposição de dados sensíveis
 */
import { useCallback } from 'react'
import { secureStorage } from './secureStorage'

// Tipos de erro conhecidos
export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  AUTHENTICATION: 'AUTH_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  SERVER: 'SERVER_ERROR',
  CLIENT: 'CLIENT_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
}

// Mensagens de erro amigáveis
const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: 'Erro de conexão. Verifique sua internet e tente novamente.',
  [ERROR_TYPES.AUTHENTICATION]: 'Sessão expirada. Faça login novamente.',
  [ERROR_TYPES.AUTHORIZATION]: 'Você não tem permissão para realizar esta ação.',
  [ERROR_TYPES.VALIDATION]: 'Dados inválidos. Verifique as informações e tente novamente.',
  [ERROR_TYPES.SERVER]: 'Erro interno do servidor. Tente novamente em alguns minutos.',
  [ERROR_TYPES.CLIENT]: 'Erro na aplicação. Recarregue a página e tente novamente.',
  [ERROR_TYPES.UNKNOWN]: 'Erro inesperado. Tente novamente.'
}

/**
 * Classifica o tipo de erro baseado no status HTTP e outras características
 */
function classifyError(error) {
  // Erro de rede
  if (!error.response && error.code === 'NETWORK_ERROR') {
    return ERROR_TYPES.NETWORK
  }

  // Erro de timeout
  if (error.code === 'ECONNABORTED') {
    return ERROR_TYPES.NETWORK
  }

  // Baseado no status HTTP
  if (error.response) {
    const status = error.response.status
    
    if (status === 401) {
      return ERROR_TYPES.AUTHENTICATION
    }
    
    if (status === 403) {
      return ERROR_TYPES.AUTHORIZATION
    }
    
    if (status >= 400 && status < 500) {
      return ERROR_TYPES.VALIDATION
    }
    
    if (status >= 500) {
      return ERROR_TYPES.SERVER
    }
  }

  return ERROR_TYPES.UNKNOWN
}

/**
 * Extrai informações seguras do erro (sem expor dados sensíveis)
 */
function extractSafeErrorInfo(error) {
  const errorType = classifyError(error)
  const userMessage = ERROR_MESSAGES[errorType]
  
  // Informações básicas seguras
  const safeInfo = {
    type: errorType,
    message: userMessage,
    timestamp: new Date().toISOString(),
    status: error.response?.status || null
  }

  // Em desenvolvimento, adiciona mais detalhes
  if (import.meta.env.DEV) {
    safeInfo.details = {
      originalMessage: error.message,
      stack: error.stack,
      config: error.config ? {
        method: error.config.method,
        url: error.config.url,
        timeout: error.config.timeout
      } : null
    }
  }

  return safeInfo
}

/**
 * Handler principal de erros
 */
export class ErrorHandler {
  static instance = null
  
  constructor() {
    this.errorListeners = []
    this.setupGlobalErrorHandlers()
  }

  static getInstance() {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  /**
   * Configura handlers globais de erro
   */
  setupGlobalErrorHandlers() {
    // Erros JavaScript não capturados
    window.addEventListener('error', (event) => {
      this.handleError(event.error, 'GLOBAL_ERROR')
    })

    // Promises rejeitadas não capturadas
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, 'UNHANDLED_PROMISE')
    })
  }

  /**
   * Adiciona um listener de erro
   */
  addErrorListener(listener) {
    this.errorListeners.push(listener)
  }

  /**
   * Remove um listener de erro
   */
  removeErrorListener(listener) {
    this.errorListeners = this.errorListeners.filter(l => l !== listener)
  }

  /**
   * Notifica todos os listeners
   */
  notifyListeners(errorInfo) {
    this.errorListeners.forEach(listener => {
      try {
        listener(errorInfo)
      } catch (err) {
        console.error('Erro no listener de erro:', err)
      }
    })
  }

  /**
   * Processa e trata um erro
   */
  handleError(error, context = 'UNKNOWN') {
    const errorInfo = extractSafeErrorInfo(error)
    errorInfo.context = context

    // Log seguro (apenas em desenvolvimento)
    if (import.meta.env.DEV) {
      console.group(`🚨 Erro [${errorInfo.type}]`)
      console.error('Mensagem:', errorInfo.message)
      console.error('Contexto:', context)
      console.error('Status:', errorInfo.status)
      if (errorInfo.details) {
        console.error('Detalhes:', errorInfo.details)
      }
      console.groupEnd()
    }

    // Notifica listeners (ex: toast, analytics)
    this.notifyListeners(errorInfo)

    return errorInfo
  }

  /**
   * Handler específico para erros de API
   */
  handleApiError(error, context = 'API_CALL') {
    const errorInfo = this.handleError(error, context)
    
    // Ações específicas baseadas no tipo de erro
    switch (errorInfo.type) {
      case ERROR_TYPES.AUTHENTICATION:
        // Redirecionar para login ou limpar sessão
        this.handleAuthenticationError()
        break
        
      case ERROR_TYPES.NETWORK:
        // Tentar reconectar ou mostrar status offline
        this.handleNetworkError()
        break
    }

    return errorInfo
  }

  /**
   * Trata erros de autenticação
   */
  handleAuthenticationError() {
    // Se há tokens (local) ou modo cookie, não redirecionar automaticamente.
    // Isso evita queda para /login durante bootstrap ou chamadas secundárias que podem retornar 401.
    try {
      const hasLocalToken = Boolean(secureStorage.getItem('access_token') || secureStorage.getItem('refresh_token'))
      const runtimeStorage = String(secureStorage.getItem('auth_storage') || import.meta.env.VITE_AUTH_STORAGE || 'local').toLowerCase()
      const onLoginPage = window.location.pathname.includes('/login')

      // Em modo cookie, o backend controla sessão via HttpOnly; em presença de tokens locais, preservar estado.
      if (runtimeStorage === 'cookie' || hasLocalToken) {
        // Deixar o AuthProvider e os interceptors decidirem (refresh ou carregamento do usuário)
        return
      }

      // Sem qualquer token: aí sim redirecionar para login
      if (!onLoginPage) {
        window.location.href = '/login'
      }
    } catch {
      // Em caso de erro inesperado, fazer fallback seguro
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
  }

  /**
   * Trata erros de rede
   */
  handleNetworkError() {
    // Implementar lógica de retry ou modo offline
    console.warn('Erro de rede detectado')
  }
}

/**
 * Hook React para usar o ErrorHandler
 */
export function useErrorHandler() {
  const errorHandler = ErrorHandler.getInstance()

  // Memoiza handlers para evitar recriação a cada render e loops em efeitos
  const handleError = useCallback((error, context) => {
    return errorHandler.handleError(error, context)
  }, [])

  const handleApiError = useCallback((error, context) => {
    return errorHandler.handleApiError(error, context)
  }, [])

  return {
    handleError,
    handleApiError
  }
}

/**
 * Wrapper seguro para chamadas de API
 */
export async function safeApiCall(apiCall, context = 'API_CALL') {
  const errorHandler = ErrorHandler.getInstance()
  try {
    const result = await apiCall()
    return result
  } catch (error) {
    const processed = errorHandler.handleApiError(error, context)
    // Re-throw processado, sem dados sensíveis
    const err = new Error(processed.message)
    err.type = processed.type
    err.status = processed.status
    throw err
  }
}

/**
 * Decorator para métodos que fazem chamadas de API
 */
export function withErrorHandling(context) {
  const errorHandler = ErrorHandler.getInstance()
  return function(target, name, descriptor) {
    const original = descriptor.value
    descriptor.value = async function(...args) {
      try {
        return await original.apply(this, args)
      } catch (error) {
        const processed = errorHandler.handleApiError(error, context || name)
        const err = new Error(processed.message)
        err.type = processed.type
        err.status = processed.status
        throw err
      }
    }
    return descriptor
  }
}

// Inicializa o ErrorHandler uma vez
ErrorHandler.getInstance()