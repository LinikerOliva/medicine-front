import api from "./api"

export const authService = {
  async login(credentials) {
    const endpoint = import.meta.env.VITE_LOGIN_ENDPOINT || "/auth/login/"
    // envia também 'username' se só tiver 'email'
    const payload = {
      ...credentials,
      username: credentials.username || credentials.email,
    }
    const response = await api.post(endpoint, payload)

    const { access, refresh, access_token, refresh_token, token, key, user } = response.data
    const accessToken = access || access_token || token || key
    const refreshToken = refresh || refresh_token

    // Detecta e salva o esquema de auth (Bearer para JWT; Token para DRF TokenAuth)
    if (access || access_token) {
      localStorage.setItem("auth_scheme", "Bearer")
    } else if (token || key) {
      const val = token || key
      const looksLikeJwt = typeof val === "string" && val.includes(".")
      localStorage.setItem("auth_scheme", looksLikeJwt ? "Bearer" : "Token")
    }

    if (accessToken) localStorage.setItem("access_token", accessToken)
    if (refreshToken) localStorage.setItem("refresh_token", refreshToken)

    // Salva usuário se vier no payload
    if (user !== undefined) {
      try {
        if (user && typeof user === "object") {
          localStorage.setItem("user", JSON.stringify(user))
        } else {
          localStorage.removeItem("user")
        }
      } catch {
        // ignore
      }
    }

    // NOVO: Sempre tenta descobrir o usuário atual se não houver user no retorno
    if (!user) {
      try {
        const me = await fetchCurrentUserFromApi()
        if (me) {
          localStorage.setItem("user", JSON.stringify(me))
          response.data.user = me
        }
      } catch {
        // manter sem user
      }
    }

    return response.data
  },

  async register(userData) {
    const endpoint = import.meta.env.VITE_REGISTER_ENDPOINT || "/auth/register/"
    const response = await api.post(endpoint, userData)

    // Normaliza possíveis formatos de resposta
    const { access, refresh, access_token, refresh_token, token, user } = response.data
    const accessToken = access || access_token || token
    const refreshToken = refresh || refresh_token

    if (access || access_token) {
      localStorage.setItem("auth_scheme", "Bearer")
    } else if (token) {
      const looksLikeJwt = typeof token === "string" && token.includes(".")
      localStorage.setItem("auth_scheme", looksLikeJwt ? "Bearer" : "Token")
    }

    if (accessToken) localStorage.setItem("access_token", accessToken)
    if (refreshToken) localStorage.setItem("refresh_token", refreshToken)
    if (user !== undefined) {
      localStorage.setItem("user", JSON.stringify(user))
    } else {
      // Também tenta descobrir o usuário após registro, quando aplicável
      try {
        const me = await fetchCurrentUserFromApi()
        if (me) localStorage.setItem("user", JSON.stringify(me))
      } catch {}
    }

    return response.data
  },

  async logout() {
    try {
      const endpoint = import.meta.env.VITE_LOGOUT_ENDPOINT || "/auth/logout/"
      await api.post(endpoint)
    } finally {
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
      localStorage.removeItem("user")
      localStorage.removeItem("auth_scheme")
      // NOVO: limpar qualquer status de solicitação (todas as chaves que começam com medicoApplicationStatus)
      try {
        const toRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith("medicoApplicationStatus")) {
            toRemove.push(key)
          }
        }
        toRemove.forEach((k) => localStorage.removeItem(k))
      } catch {}
    }
  },

  async forgotPassword(email) {
    const response = await api.post("/auth/forgot-password/", { email })
    return response.data
  },

  getCurrentUser() {
    const raw = localStorage.getItem("user")
    if (!raw || raw === "undefined" || raw === "null") return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  },

  // Atualiza o usuário a partir dos endpoints “me” e persiste no localStorage
  async refreshCurrentUser() {
    try {
      const me = await fetchCurrentUserFromApi()
      if (me) {
        localStorage.setItem("user", JSON.stringify(me))
        return me
      } else {
        localStorage.removeItem("user")
        return null
      }
    } catch {
      return null
    }
  },

  // NOVO: indica se há um token válido armazenado (sem validar expiração aqui)
  isAuthenticated() {
    try {
      const token = localStorage.getItem("access_token")
      return !!token
    } catch {
      return false
    }
  },

  // NOVO: login social com Google (envia credential/id_token) e normaliza resposta
  async loginWithGoogle(credential) {
    const endpoint = import.meta.env.VITE_GOOGLE_LOGIN_ENDPOINT || "/auth/google/"
    const payload = { credential, id_token: credential }
    const response = await api.post(endpoint, payload)

    const { access, refresh, access_token, refresh_token, token, key, user } = response.data
    const accessToken = access || access_token || token || key
    const refreshToken = refresh || refresh_token

    // Detecta esquema
    if (access || access_token) {
      localStorage.setItem("auth_scheme", "Bearer")
    } else if (token || key) {
      const val = token || key
      const looksLikeJwt = typeof val === "string" && val.includes(".")
      localStorage.setItem("auth_scheme", looksLikeJwt ? "Bearer" : "Token")
    }
    if (accessToken) localStorage.setItem("access_token", accessToken)
    if (refreshToken) localStorage.setItem("refresh_token", refreshToken)

    if (user !== undefined) {
      try {
        if (user && typeof user === "object") {
          localStorage.setItem("user", JSON.stringify(user))
        } else {
          localStorage.removeItem("user")
        }
      } catch {}
    } else {
      // buscar usuário se o backend não retornar
      try {
        const me = await fetchCurrentUserFromApi()
        if (me) localStorage.setItem("user", JSON.stringify(me))
        response.data.user = me || null
      } catch {}
    }

    return response.data
  },
}

// Helper: tenta descobrir o usuário atual em endpoints “me” comuns
async function fetchCurrentUserFromApi() {
  // Prioriza endpoint de env, se configurado
  const meEnv = (import.meta.env.VITE_ME_ENDPOINT || "").trim()

  const candidates = []
  if (meEnv) candidates.push(meEnv)
  // Endpoints comuns (Djoser, DRF SimpleJWT, etc.)
  candidates.push(
    "/auth/users/me/", // Djoser padrão
    "/users/me/",
    "/auth/user/",
    "/auth/me/",
    "/me/",
  )

  // Normalização/remoção de duplicados
  const seen = new Set()
  const unique = candidates.filter((u) => {
    const key = String(u).replace(/\/+$/g, "")
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  for (const url of unique) {
    try {
      const res = await api.get(url)
      return res.data
    } catch (e) {
      if (e?.response?.status === 404) continue
    }
  }
  return null
}
