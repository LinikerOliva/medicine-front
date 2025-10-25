/**
 * Sistema de cache para requisições API
 * Melhora performance e reduz chamadas desnecessárias
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// Cache global em memória
const globalCache = new Map()
const cacheTimestamps = new Map()
const pendingRequests = new Map()

// Configurações padrão
const DEFAULT_CONFIG = {
  ttl: 5 * 60 * 1000, // 5 minutos
  maxSize: 100, // máximo de 100 entradas
  staleWhileRevalidate: true, // retorna dados antigos enquanto revalida
  retryOnError: true,
  maxRetries: 3,
  retryDelay: 1000
}

/**
 * Gera chave única para cache baseada na URL e parâmetros
 */
function generateCacheKey(url, params = {}) {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key]
      return result
    }, {})
  
  return `${url}:${JSON.stringify(sortedParams)}`
}

/**
 * Verifica se uma entrada do cache ainda é válida
 */
function isCacheValid(key, ttl) {
  const timestamp = cacheTimestamps.get(key)
  if (!timestamp) return false
  
  return Date.now() - timestamp < ttl
}

/**
 * Limpa entradas expiradas do cache
 */
function cleanExpiredCache(ttl) {
  const now = Date.now()
  
  for (const [key, timestamp] of cacheTimestamps.entries()) {
    if (now - timestamp > ttl) {
      globalCache.delete(key)
      cacheTimestamps.delete(key)
    }
  }
}

/**
 * Limita o tamanho do cache removendo entradas mais antigas
 */
function limitCacheSize(maxSize) {
  if (globalCache.size <= maxSize) return
  
  // Ordena por timestamp (mais antigo primeiro)
  const entries = Array.from(cacheTimestamps.entries())
    .sort(([, a], [, b]) => a - b)
  
  // Remove as entradas mais antigas
  const toRemove = entries.slice(0, globalCache.size - maxSize)
  
  for (const [key] of toRemove) {
    globalCache.delete(key)
    cacheTimestamps.delete(key)
  }
}

/**
 * Hook para cache de API com funcionalidades avançadas
 */
export function useApiCache(config = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const mountedRef = useRef(true)
  
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const get = useCallback(async (url, params = {}, options = {}) => {
    const cacheKey = generateCacheKey(url, params)
    const requestConfig = { ...finalConfig, ...options }
    
    // Verifica se há dados válidos no cache
    if (isCacheValid(cacheKey, requestConfig.ttl)) {
      const cachedData = globalCache.get(cacheKey)
      
      // Se staleWhileRevalidate está ativo, retorna dados antigos e revalida em background
      if (requestConfig.staleWhileRevalidate && cachedData) {
        // Revalida em background se os dados estão ficando antigos
        const age = Date.now() - cacheTimestamps.get(cacheKey)
        if (age > requestConfig.ttl * 0.8) { // 80% do TTL
          // Não aguarda a revalidação
          get(url, params, { ...options, skipCache: true }).catch(() => {})
        }
        
        return cachedData
      }
    }
    
    // Verifica se já há uma requisição pendente para evitar duplicatas
    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey)
    }
    
    // Função para fazer a requisição
    const makeRequest = async (retryCount = 0) => {
      try {
        // Aqui você deve implementar sua lógica de requisição
        // Por exemplo, usando fetch ou axios
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          },
          ...options.fetchOptions
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        
        // Só atualiza o cache se o componente ainda estiver montado
        if (mountedRef.current && !options.skipCache) {
          // Limpa cache expirado antes de adicionar nova entrada
          cleanExpiredCache(requestConfig.ttl)
          
          // Adiciona ao cache
          globalCache.set(cacheKey, data)
          cacheTimestamps.set(cacheKey, Date.now())
          
          // Limita o tamanho do cache
          limitCacheSize(requestConfig.maxSize)
        }
        
        return data
        
      } catch (error) {
        // Retry logic
        if (requestConfig.retryOnError && retryCount < requestConfig.maxRetries) {
          await new Promise(resolve => 
            setTimeout(resolve, requestConfig.retryDelay * Math.pow(2, retryCount))
          )
          return makeRequest(retryCount + 1)
        }
        
        throw error
      }
    }
    
    // Cria a promise da requisição
    const requestPromise = makeRequest()
      .finally(() => {
        // Remove da lista de requisições pendentes
        pendingRequests.delete(cacheKey)
      })
    
    // Adiciona à lista de requisições pendentes
    pendingRequests.set(cacheKey, requestPromise)
    
    return requestPromise
    
  }, [finalConfig])

  const invalidate = useCallback((url, params = {}) => {
    const cacheKey = generateCacheKey(url, params)
    globalCache.delete(cacheKey)
    cacheTimestamps.delete(cacheKey)
  }, [])

  const invalidatePattern = useCallback((pattern) => {
    const regex = new RegExp(pattern)
    
    for (const key of globalCache.keys()) {
      if (regex.test(key)) {
        globalCache.delete(key)
        cacheTimestamps.delete(key)
      }
    }
  }, [])

  const clear = useCallback(() => {
    globalCache.clear()
    cacheTimestamps.clear()
    pendingRequests.clear()
  }, [])

  const getStats = useCallback(() => {
    return {
      size: globalCache.size,
      pendingRequests: pendingRequests.size,
      keys: Array.from(globalCache.keys())
    }
  }, [])

  return {
    get,
    invalidate,
    invalidatePattern,
    clear,
    getStats
  }
}

/**
 * Hook para requisições com cache automático
 */
export function useCachedApi(url, params = {}, options = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const cache = useApiCache(options.cacheConfig)
  const mountedRef = useRef(true)
  
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchData = useCallback(async () => {
    if (!url) return
    
    try {
      setLoading(true)
      setError(null)
      
      const result = await cache.get(url, params, options)
      
      if (mountedRef.current) {
        setData(result)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err)
        console.error('API Cache Error:', err)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [url, params, options, cache])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refetch = useCallback(() => {
    cache.invalidate(url, params)
    return fetchData()
  }, [cache, url, params, fetchData])

  const mutate = useCallback((newData) => {
    setData(newData)
    // Atualiza o cache também
    const cacheKey = generateCacheKey(url, params)
    globalCache.set(cacheKey, newData)
    cacheTimestamps.set(cacheKey, Date.now())
  }, [url, params])

  return {
    data,
    loading,
    error,
    refetch,
    mutate
  }
}

/**
 * Hook para pré-carregar dados
 */
export function usePreload() {
  const cache = useApiCache()

  const preload = useCallback((url, params = {}, options = {}) => {
    // Pré-carrega dados em background
    cache.get(url, params, options).catch(() => {
      // Ignora erros no preload
    })
  }, [cache])

  return { preload }
}

/**
 * Componente Provider para configuração global do cache
 */
export function ApiCacheProvider({ children, config = {} }) {
  useEffect(() => {
    // Configura limpeza automática do cache
    const interval = setInterval(() => {
      cleanExpiredCache(config.ttl || DEFAULT_CONFIG.ttl)
    }, 60000) // Limpa a cada minuto

    return () => clearInterval(interval)
  }, [config.ttl])

  return children
}

/**
 * Utilitários para debugging
 */
export const cacheUtils = {
  getGlobalCache: () => globalCache,
  getCacheTimestamps: () => cacheTimestamps,
  getPendingRequests: () => pendingRequests,
  clearAll: () => {
    globalCache.clear()
    cacheTimestamps.clear()
    pendingRequests.clear()
  }
}