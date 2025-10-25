"use client"

import { useState, useCallback } from "react"
import { useToast } from "./use-toast"
import { useErrorHandler } from "../utils/errorHandler"

export function useMutation(mutationFunction, options = {}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { toast } = useToast()
  const { handleApiError } = useErrorHandler()

  const mutate = useCallback(async (variables) => {
    try {
      setLoading(true)
      setError(null)

      const result = await mutationFunction(variables)

      if (options.onSuccess) {
        options.onSuccess(result)
      }

      if (options.successMessage) {
        toast({
          title: "Sucesso",
          description: options.successMessage,
        })
      }

      return result
    } catch (err) {
      // Usa o sistema centralizado de tratamento de erros
      const errorInfo = handleApiError(err, options.context || 'MUTATION')
      setError(errorInfo.message)

      if (options.onError) {
        options.onError(errorInfo)
      }

      // Só mostra toast se não foi tratado pelo onError
      if (!options.onError || options.showToastOnError !== false) {
        toast({
          title: "Erro",
          description: errorInfo.message,
          variant: "destructive",
        })
      }

      throw errorInfo
    } finally {
      setLoading(false)
    }
  }, [mutationFunction, options, toast, handleApiError])

  return { mutate, loading, error }
}
