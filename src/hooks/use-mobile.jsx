"use client"

import { useEffect, useState } from "react"

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // Verificar inicialmente
    checkIsMobile()

    // Adicionar listener para redimensionamento
    window.addEventListener("resize", checkIsMobile)

    // Limpar listener
    return () => window.removeEventListener("resize", checkIsMobile)
  }, [])

  return isMobile
}
