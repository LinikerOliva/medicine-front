import axios from "axios"
import { secureStorage } from "../utils/secureStorage"
import { mockService } from "./mockService"

// Usar variáveis de ambiente
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"
const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH || "/api"
// Runtime override: allow setting API URL without rebuild (Render/Prod)
const RUNTIME_API_URL = (() => {
  try {
    if (typeof window !== "undefined") {
      return (
        window.__API_BASE_URL ||
        window.sessionStorage?.getItem("api_url") ||
        window.localStorage?.getItem("api_url") ||
        null
      )
    }
  } catch {}
  return import.meta.env.VITE_RUNTIME_API_URL || null
})()
const EFFECTIVE_API_URL = RUNTIME_API_URL || API_BASE_URL

// Em desenvolvimento, por padrão usar o proxy do Vite
const IS_DEV = import.meta.env.DEV
const USE_PROXY = RUNTIME_API_URL ? false : (String(import.meta.env.VITE_USE_PROXY ?? "true").toLowerCase() !== "false")
const API_VERBOSE = String(import.meta.env.VITE_API_VERBOSE_LOGS ?? "false").toLowerCase() === "true"
const API_SILENCE_ERRORS = String(import.meta.env.VITE_API_SILENCE_ERRORS ?? "true").toLowerCase() !== "false"
const AUTH_STORAGE_ENV = String(import.meta.env.VITE_AUTH_STORAGE || "local").toLowerCase() // 'cookie' | 'local'

// Origin base (em dev com proxy, deixamos vazio para usar o host atual)
const BASE_ORIGIN = IS_DEV && USE_PROXY ? "" : EFFECTIVE_API_URL

// Log de diagnóstico (ajuda a confirmar no console do navegador)
if (typeof window !== "undefined") {
  if (IS_DEV && API_VERBOSE) {
    console.info("[api] DEV=", IS_DEV, "USE_PROXY=", USE_PROXY, "BASE_ORIGIN=", BASE_ORIGIN, "API_BASE_PATH=", API_BASE_PATH, "AUTH_STORAGE_ENV=", AUTH_STORAGE_ENV)
  }
}

// Helper para normalizar paths
const trimSlashes = (s = "") => s.replace(/^\/+|\/+$/g, "")
const trimLeadingSlashes = (s = "") => s.replace(/^\/+/, "")
const startsWithHttp = (u = "") => /^https?:\/\//i.test(u)
const normalizeApiPath = (p = "") => {
  const base = "/" + trimSlashes(API_BASE_PATH || "/api")
  if (!p) return base + "/"
  // já começa com /api
  if (p.startsWith(base + "/") || p === base || p.startsWith(base + "?")) return p

  // Preserva barra final e query string do caminho original
  const [pathOnly, query = ""] = String(p).split("?")
  const hasTrailingSlash = /\/$/.test(pathOnly || "")
  const clean = trimLeadingSlashes(pathOnly || "")

  let normalized = `${base}/${clean ? clean : ""}`
  if (hasTrailingSlash || !clean) normalized += "/"
  if (query) normalized += `?${query}`

  // Colapsa barras duplicadas (não há protocolo aqui)
  normalized = normalized.replace(/\/{2,}/g, "/")
  return normalized
}

// Criar instância do axios
const api = axios.create({
  // Em dev, baseURL vazio usa o origin atual (localhost:5173)
  // Em prod, baseURL é o host do backend (sem base path)
  baseURL: BASE_ORIGIN || undefined,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
  // Quando AUTH_STORAGE = 'cookie', o backend controla cookies HttpOnly
  withCredentials: AUTH_STORAGE_ENV === "cookie",
})

// Interceptor para normalizar URL (garante prefixo /api tanto em dev quanto em prod)
api.interceptors.request.use((config) => {
  const rawUrl = config.url || ""

  // 1) Normalizar caminho para sempre incluir API_BASE_PATH quando não for URL absoluta
  if (!startsWithHttp(rawUrl)) {
    const normalized = normalizeApiPath(rawUrl)
    // Em dev com proxy -> caminho relativo "/api/..." no mesmo host (5173)
    if (IS_DEV && USE_PROXY) {
      config.baseURL = "" // usar origin atual
      config.url = normalized.startsWith("/") ? normalized : "/" + normalized
    } else {
      // Em prod/override -> baseURL é o host do backend (Render/Prod)
      config.baseURL = (EFFECTIVE_API_URL || "").replace(/\/+$/g, "")
      config.url = normalized.startsWith("/") ? normalized : "/" + normalized
    }
  }

  // Atualiza withCredentials dinamicamente conforme storage em runtime
  try {
    const runtimeStorage = String(secureStorage.getItem("auth_storage") || AUTH_STORAGE_ENV).toLowerCase()
    config.withCredentials = runtimeStorage === "cookie"
  } catch {}

  // 2) Autenticação: não anexar Authorization aos endpoints de auth
  const LOGIN_ENDPOINT = import.meta.env.VITE_LOGIN_ENDPOINT || "/auth/login/"
  const REGISTER_ENDPOINT = import.meta.env.VITE_REGISTER_ENDPOINT || "/auth/register/"
  const FORGOT_PASSWORD_ENDPOINT = "/auth/forgot-password/"
  const GOOGLE_LOGIN_ENDPOINT = import.meta.env.VITE_GOOGLE_LOGIN_ENDPOINT || "/auth/google/"
  const REFRESH_ENDPOINT = (import.meta.env.VITE_REFRESH_TOKEN_ENDPOINT || import.meta.env.VITE_REFRESH_ENDPOINT || "/auth/token/refresh/") // usado apenas para cookie/local refresh
  const isAuthRequest = (url = "") =>
    [LOGIN_ENDPOINT, REGISTER_ENDPOINT, FORGOT_PASSWORD_ENDPOINT, GOOGLE_LOGIN_ENDPOINT, REFRESH_ENDPOINT].some((ep) => url.includes(ep))

  if (isAuthRequest(config.url || "")) {
    return config
  }

  // Em modo cookie, não usamos Authorization manualmente, os cookies vão junto
  const runtimeStorage = String(secureStorage.getItem("auth_storage") || AUTH_STORAGE_ENV).toLowerCase()
  if (runtimeStorage !== "cookie") {
    const token = secureStorage.getItem("access_token")
    let scheme = secureStorage.getItem("auth_scheme") || import.meta.env.VITE_AUTH_SCHEME || ""

    if (!scheme) {
      scheme = token && token.includes(".") ? "Bearer" : "Token"
      try {
        secureStorage.setItem("auth_scheme", scheme)
      } catch {}
    }

    // Auto-correção: se o esquema não combinar com o formato do token, ajustar dinamicamente
    try {
      if (token && token.includes(".") && /^token$/i.test(String(scheme))) {
        scheme = "Bearer"
        secureStorage.setItem("auth_scheme", scheme)
      } else if (token && !token.includes(".") && /^bearer$/i.test(String(scheme))) {
        scheme = "Token"
        secureStorage.setItem("auth_scheme", scheme)
      }
    } catch {}

    if (token) {
      config.headers.Authorization = `${scheme} ${token}`
    } else {
      delete config.headers.Authorization
    }
  } else {
    // Cookie-mode: garantir que Authorization não fique setado
    if (config.headers && config.headers.Authorization) {
      delete config.headers.Authorization
    }
  }

  // Se for enviar FormData, remove Content-Type para o browser definir o boundary corretamente
  if (config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers["Content-Type"]
    }
  }

  return config
})

// Interceptor de resposta: refresh automático em 401 e logs de rede em DEV
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status
    const originalRequest = error?.config || {}

    // Se for erro 404 e o endpoint deve ser mockado, retorna resposta mockada
    if (status === 404 && mockService.shouldMock(originalRequest.url || '')) {
      console.log(`[MOCK] Interceptando erro 404 para ${originalRequest.url}`);
      await mockService.simulateNetworkDelay(50);
      return Promise.resolve(mockService.getMockResponse(originalRequest.url, originalRequest.method));
    }

    // Tentativa de refresh UNA VEZ por requisição
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const runtimeStorage = String(secureStorage.getItem("auth_storage") || AUTH_STORAGE_ENV).toLowerCase()
        if (runtimeStorage === "cookie") {
          // Backend renova cookies HttpOnly
          const refreshUrl = import.meta.env.VITE_REFRESH_ENDPOINT || "/auth/refresh/"
          await api.post(refreshUrl, {}, { withCredentials: true })
          return api(originalRequest)
        } else {
          // LocalStorage: usa refresh_token
          const refreshUrl = (import.meta.env.VITE_REFRESH_TOKEN_ENDPOINT || import.meta.env.VITE_REFRESH_ENDPOINT || "/auth/token/refresh/")
          const refreshToken = secureStorage.getItem("refresh_token")
          if (refreshToken) {
            const resp = await api.post(refreshUrl, { refresh: refreshToken })
            const newAccess = resp?.data?.access || resp?.data?.access_token || resp?.data?.token
            const newRefresh = resp?.data?.refresh || resp?.data?.refresh_token
            if (newAccess) secureStorage.setItem("access_token", newAccess)
            if (newRefresh) secureStorage.setItem("refresh_token", newRefresh)
            // Atualiza Authorization para re-tentar
            originalRequest.headers = originalRequest.headers || {}
            const scheme = secureStorage.getItem("auth_scheme") || (newAccess && newAccess.includes(".") ? "Bearer" : "Token")
            originalRequest.headers.Authorization = `${scheme} ${secureStorage.getItem("access_token")}`
            return api(originalRequest)
          }
        }
      } catch (refreshError) {
        // Falha ao renovar: prossegue para rejeição
      }
    }

    if (IS_DEV && API_SILENCE_ERRORS) {
      // Silencia erros de rede no console para reduzir ruído no DEV
      return Promise.reject(error)
    }
    if (IS_DEV && API_VERBOSE) {
      if (error.code === "ECONNABORTED") {
        console.error("[API] Tempo de requisição esgotado:", error.config?.url)
      } else if (error.message?.includes("Network Error")) {
        console.error(
          "[API] Erro de rede ao acessar o backend. Verifique se o servidor está rodando em",
          (IS_DEV && USE_PROXY) ? window.location.origin + (API_BASE_PATH || "/api") : (API_BASE_URL + (API_BASE_PATH || "/api"))
        )
      }
    }
    return Promise.reject(error)
  }
)

export default api

// Exportar função signPrescription do digitalSignatureService
import digitalSignatureServiceInstance from './digitalSignatureService'
export const signPrescription = (prescriptionData) => {
  return digitalSignatureServiceInstance.signPrescription(prescriptionData)
}
