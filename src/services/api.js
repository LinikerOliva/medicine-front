import axios from "axios"

// Usar variáveis de ambiente
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"
const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH || "/api"

// Em desenvolvimento, por padrão usar o proxy do Vite
const IS_DEV = import.meta.env.DEV
const USE_PROXY = String(import.meta.env.VITE_USE_PROXY ?? "true").toLowerCase() !== "false"
const API_VERBOSE = String(import.meta.env.VITE_API_VERBOSE_LOGS ?? "false").toLowerCase() === "true"
const API_SILENCE_ERRORS = String(import.meta.env.VITE_API_SILENCE_ERRORS ?? "true").toLowerCase() !== "false"

// Origin base (em dev com proxy, deixamos vazio para usar o host atual)
const BASE_ORIGIN = IS_DEV && USE_PROXY ? "" : API_BASE_URL

// Log de diagnóstico (ajuda a confirmar no console do navegador)
if (typeof window !== "undefined") {
  if (IS_DEV && API_VERBOSE) {
    console.info("[api] DEV=", IS_DEV, "USE_PROXY=", USE_PROXY, "BASE_ORIGIN=", BASE_ORIGIN, "API_BASE_PATH=", API_BASE_PATH)
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
      // Em prod -> baseURL é o host do backend e a URL inclui o base path
      config.baseURL = (API_BASE_URL || "").replace(/\/+$/g, "")
      config.url = normalized.startsWith("/") ? normalized : "/" + normalized
    }
  }

  // 2) Autenticação: não anexar Authorization aos endpoints de auth
  const LOGIN_ENDPOINT = import.meta.env.VITE_LOGIN_ENDPOINT || "/auth/login/"
  const REGISTER_ENDPOINT = import.meta.env.VITE_REGISTER_ENDPOINT || "/auth/register/"
  const FORGOT_PASSWORD_ENDPOINT = "/auth/forgot-password/"
  const GOOGLE_LOGIN_ENDPOINT = import.meta.env.VITE_GOOGLE_LOGIN_ENDPOINT || "/auth/google/"
  const isAuthRequest = (url = "") =>
    [LOGIN_ENDPOINT, REGISTER_ENDPOINT, FORGOT_PASSWORD_ENDPOINT, GOOGLE_LOGIN_ENDPOINT].some((ep) => url.includes(ep))

  if (isAuthRequest(config.url || "")) {
    return config
  }

  const token = localStorage.getItem("access_token")
  let scheme = localStorage.getItem("auth_scheme") || import.meta.env.VITE_AUTH_SCHEME || ""

  if (!scheme) {
    scheme = token && token.includes(".") ? "Bearer" : "Token"
    try {
      localStorage.setItem("auth_scheme", scheme)
    } catch {}
  }

  if (token) {
    config.headers.Authorization = `${scheme} ${token}`
  } else {
    delete config.headers.Authorization
  }

  return config
})

// Interceptor de resposta para logar erros de rede amigavelmente no dev
api.interceptors.response.use(
  (res) => res,
  (error) => {
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
