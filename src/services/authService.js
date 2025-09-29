import api from "./api"

// Helpers de normalização de usuário
const toInputDate = (v) => {
  if (!v) return ""
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const iso = new Date(v)
  if (!isNaN(iso)) {
    const y = iso.getFullYear()
    const m = String(iso.getMonth() + 1).padStart(2, "0")
    const d = String(iso.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }
  const m1 = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`
  return ""
}

function normalizeUser(u) {
  if (!u || typeof u !== "object") return u
  const out = { ...u }
  // Nome de exibição
  const displayName = [out.first_name, out.last_name].filter(Boolean).join(" ") || out.display_name || out.nome || out.nome_completo || out.username || out.email || ""
  out.display_name = displayName
  // CPF e RG: mapear cpf a partir de vários campos e, se não houver rg, usar cpf para compatibilidade
  const cpf = out.cpf || out.documento || out.doc || out.rg || out.cpf_number || (out.profile && (out.profile.cpf || out.profile.documento)) || ""
  if (cpf) {
    out.cpf = cpf
    if (!out.rg) out.rg = cpf
  }
  // Data de nascimento: priorizar campo da tabela meu_app_user e normalizar formato
  const dn = out.data_nascimento || out.nascimento || out.dob || out.birth_date || (out.profile && (out.profile.data_nascimento || out.profile.nascimento)) || ""
  const dnNorm = toInputDate(dn)
  if (dnNorm) out.data_nascimento = dnNorm
  return out
}

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

    // Salva usuário se vier no payload (normalizado)
    if (user !== undefined) {
      try {
        if (user && typeof user === "object") {
          const nu = normalizeUser(user)
          localStorage.setItem("user", JSON.stringify(nu))
          response.data.user = nu
        } else {
          localStorage.removeItem("user")
        }
      } catch {
        // ignore
      }
    }

    // NOVO: Sempre tenta descobrir o usuário atual se não houver user no retorno
    if (!response.data.user) {
      try {
        const me = await fetchCurrentUserFromApi()
        if (me) {
          const nu = normalizeUser(me)
          localStorage.setItem("user", JSON.stringify(nu))
          response.data.user = nu
        }
      } catch {
        // manter sem user
      }
    }

    return response.data
  },

  async register(userData, options = {}) {
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
      const nu = user && typeof user === "object" ? normalizeUser(user) : user
      if (nu && typeof nu === "object") {
        localStorage.setItem("user", JSON.stringify(nu))
        response.data.user = nu
      } else {
        localStorage.removeItem("user")
      }
    } else {
      // Também tenta descobrir o usuário após registro, quando aplicável
      try {
        const me = await fetchCurrentUserFromApi()
        if (me) {
          const nu = normalizeUser(me)
          localStorage.setItem("user", JSON.stringify(nu))
          response.data.user = nu
        }
      } catch {}
    }

    const result = { ...response.data }
    
    // NOVO: criação automática da solicitação de médico, se dados forem fornecidos
    let medicoApplication = null
    const medicoData = options?.medicoData
    if (medicoData && typeof medicoData === "object") {
      try {
        // Fallback robusto: se não houve token após o registro, tenta login silencioso
        const hasToken = !!localStorage.getItem("access_token")
        if (!hasToken && userData?.password) {
          // 1) tenta com username (se existir)
          if (userData?.username) {
            try {
              await authService.login({ username: userData.username, password: userData.password })
            } catch {}
          }
          // 2) tenta com email como username
          if (!localStorage.getItem("access_token") && userData?.email) {
            try {
              await authService.login({ username: userData.email, email: userData.email, password: userData.password })
            } catch {}
          }
        }

        const mod = await import("./solicitacaoService")
        // Enriquecer payload com dados do usuário (alguns backends exigem nome/email/cpf na solicitação)
        const fullName = [userData.first_name || "", userData.last_name || ""].filter(Boolean).join(" ") || userData.username || ""
        const medicoPayload = {
          ...medicoData,
          nome: medicoData.nome || fullName,
          nome_completo: medicoData.nome_completo || fullName,
          email: medicoData.email || userData.email,
          cpf: medicoData.cpf || userData.cpf,
          tipo: "medico",
        }
        const created = await mod.solicitacaoService.criarSolicitacaoMedico(medicoPayload)
        medicoApplication = { success: true, data: created }
        // Após registrar a solicitação, garantir criação do registro do médico e do perfil com status pendente
        try {
          const { medicoService } = await import("./medicoService")
          await medicoService.ensureMedicoAndPerfil(medicoPayload, {})
        } catch (provisionErr) {
          console.warn("[authService.register] ensureMedicoAndPerfil falhou:", provisionErr?.response?.data || provisionErr)
        }
      } catch (err) {
        console.error("[authService.register] criarSolicitacaoMedico falhou:", err?.response?.data || err)
        medicoApplication = {
          success: false,
          error: (err && (err.response?.data || err.message)) || String(err),
        }
      }
    }

    if (medicoApplication) result.medicoApplication = medicoApplication
    return result
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
      const parsed = JSON.parse(raw)
      return normalizeUser(parsed)
    } catch {
      return null
    }
  },

  // Atualiza o usuário a partir dos endpoints “me” e persiste no localStorage
  async refreshCurrentUser() {
    try {
      const me = await fetchCurrentUserFromApi()
      if (me) {
        const nu = normalizeUser(me)
        localStorage.setItem("user", JSON.stringify(nu))
        return nu
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
          const nu = normalizeUser(user)
          localStorage.setItem("user", JSON.stringify(nu))
          response.data.user = nu
        } else {
          localStorage.removeItem("user")
        }
      } catch {}
    } else {
      // buscar usuário se o backend não retornar
      try {
        const me = await fetchCurrentUserFromApi()
        if (me) {
          const nu = normalizeUser(me)
          localStorage.setItem("user", JSON.stringify(nu))
          response.data.user = nu
        } else {
          response.data.user = null
        }
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
