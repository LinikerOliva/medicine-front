"use client"

import { useState } from "react"
import { useToast } from "./use-toast"

export function useMutation(mutationFunction, options = {}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { toast } = useToast()

  const mutate = async (variables) => {
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
      const errorMessage = err.response?.data?.message || "Erro na operação"
      setError(errorMessage)

      if (options.onError) {
        options.onError(err)
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      })

      throw err
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading, error }
}
