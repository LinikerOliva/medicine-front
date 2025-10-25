import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Hook para debounce de valores
 * Útil para otimizar buscas e requisições frequentes
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook para debounce de callbacks
 * Útil para otimizar funções que são chamadas frequentemente
 */
export function useDebouncedCallback(callback, delay = 300, deps = []) {
  const timeoutRef = useRef(null)

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay, ...deps])

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Função para cancelar o debounce
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // Função para executar imediatamente
  const flush = useCallback((...args) => {
    cancel()
    callback(...args)
  }, [callback, cancel])

  return {
    callback: debouncedCallback,
    cancel,
    flush
  }
}

/**
 * Hook para busca com debounce
 * Combina estado de busca com debounce
 */
export function useDebouncedSearch(initialValue = '', delay = 300) {
  const [searchTerm, setSearchTerm] = useState(initialValue)
  const [isSearching, setIsSearching] = useState(false)
  const debouncedSearchTerm = useDebounce(searchTerm, delay)

  // Atualiza o estado de busca
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true)
    } else {
      setIsSearching(false)
    }
  }, [searchTerm, debouncedSearchTerm])

  const clearSearch = useCallback(() => {
    setSearchTerm('')
  }, [])

  return {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm,
    clearSearch,
    isSearching
  }
}

/**
 * Hook para requisições com debounce
 * Útil para APIs de busca
 */
export function useDebouncedRequest(requestFn, delay = 300) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const abortControllerRef = useRef(null)

  const debouncedRequest = useDebouncedCallback(async (...args) => {
    // Cancela requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Cria novo AbortController
    abortControllerRef.current = new AbortController()
    
    setLoading(true)
    setError(null)

    try {
      const result = await requestFn(...args, {
        signal: abortControllerRef.current.signal
      })
      
      if (!abortControllerRef.current.signal.aborted) {
        setData(result)
      }
    } catch (err) {
      if (!abortControllerRef.current.signal.aborted) {
        setError(err)
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setLoading(false)
      }
    }
  }, delay, [requestFn])

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  return {
    request: debouncedRequest.callback,
    loading,
    data,
    error,
    reset,
    cancel: debouncedRequest.cancel
  }
}