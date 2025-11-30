import api from "./api"
import { secureStorage } from "../utils/secureStorage"
import { solicitacaoService } from "./solicitacaoService"

// Helper: converte data para formato input[type="date"]
const toInputDate = (v) => {
  if (!v) return ""
  try {
    const d = new Date(v)
    if (isNaN(d.getTime())) return ""
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  } catch {
    return ""
  }
}

function normalizeUser(u) {
  if (!u) return null
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    first_name: u.first_name || "",
    last_name: u.last_name || "",
    is_staff: u.is_staff || false,
    is_active: u.is_active !== false,
    date_joined: u.date_joined,
    last_login: u.last_login,
    // Papel/tipo usados pelos guards de rota
    role: u.role || u.tipo || u.tipo_usuario || u.user_type || "",
    tipo: u.tipo || u.role || u.tipo_usuario || u.user_type || "",
    // Campos específicos do perfil
    tipo_usuario: u.tipo_usuario || u.user_type || "",
    data_nascimento: toInputDate(u.data_nascimento || u.birth_date),
    telefone: u.telefone || u.phone || "",
    endereco: u.endereco || u.address || "",
    crm: u.crm || "",
    especialidade: u.especialidade || u.specialty || "",
  }
}

export const authService = {
  async login(credentials) {
    try {
      // Envia ambos os campos para compatibilizar com backends que exigem 'username' OU 'email'
      const userRaw = credentials.username?.trim?.() || credentials.email?.trim?.() || ""
      const isCpf11 = /^\d{11}$/.test(userRaw)
      const payload = {
        username: userRaw || undefined,
        email: userRaw || undefined,
        password: credentials.password,
      }

      // Lookup por CPF -> tenta descobrir email/username oficial
      let resolvedIdentifier = userRaw
      if (isCpf11) {
        const lookupCandidates = [
          (import.meta.env.VITE_USER_PROFILE_ENDPOINT || "/api/users/") + `?cpf=${userRaw}`,
          (import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/") + `?cpf=${userRaw}`,
          "/api/auth/users/?cpf=" + userRaw,
        ]
        for (const url of lookupCandidates) {
          try {
            const res = await api.get(url)
            const data = res?.data
            const list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
            const hit = list?.[0]
            const foundEmail = hit?.email || hit?.user?.email || null
            const foundUsername = hit?.username || hit?.user?.username || null
            if (foundEmail || foundUsername) {
              resolvedIdentifier = foundEmail || foundUsername
              break
            }
          } catch (_) {}
        }
      }

      // Primeira tentativa (padrão)
      let response
      try {
        const basePath = (import.meta.env.VITE_API_BASE_PATH || "/api").replace(/\/?$/, "/")
        const endpoint = `${basePath}auth/login/`
        response = await api.post(endpoint, { ...payload, username: resolvedIdentifier || payload.username, email: resolvedIdentifier || payload.email })
      } catch (e1) {
        // Fallback: quando o identificador for CPF, alguns backends exigem campo específico 'cpf'
        if (isCpf11) {
          const cpfPayload = { cpf: userRaw, password: credentials.password }
          const candidates = [
            import.meta.env.VITE_LOGIN_CPF_ENDPOINT || "/api/auth/login_cpf/",
            import.meta.env.VITE_LOGIN_ENDPOINT || "/api/auth/login/",
            "/auth/login_cpf/",
          ]
          let lastErr = e1
          for (const ep of candidates) {
            try {
              response = await api.post(ep, cpfPayload)
              break
            } catch (e2) {
              lastErr = e2
            }
          }
          if (!response) throw lastErr
        } else {
          throw e1
        }
      }

      if (response.data) {
        const authScheme = import.meta.env.VITE_AUTH_SCHEME || "Token"
        secureStorage.setItem("auth_scheme", authScheme)

        // Extrai tokens da resposta
        const accessToken = response.data.access_token || response.data.access || response.data.token
        const refreshToken = response.data.refresh_token || response.data.refresh

        if (accessToken) {
          secureStorage.setItem("access_token", accessToken)
        }
        if (refreshToken) {
          secureStorage.setItem("refresh_token", refreshToken)
        }

        // Se não veio nenhum token, assumir sessão via cookie
        try {
          if (!accessToken && !refreshToken) {
            secureStorage.setItem("auth_storage", "cookie")
            // Garante que chamadas subsequentes incluam cookies
            try { api.defaults.withCredentials = true } catch {}
          }
        } catch {}

        // Tenta buscar dados do usuário
        try {
          const userData = await fetchCurrentUserFromApi()
          if (userData) {
            secureStorage.setItem("user", normalizeUser(userData))
          } else {
            secureStorage.removeItem("user")
          }
        } catch (userError) {
          console.warn("Não foi possível carregar dados do usuário:", userError)
          secureStorage.removeItem("user")
        }

        return response.data
      }

      throw new Error("Resposta de login inválida")
    } catch (error) {
      console.error("Erro no login:", error)
      throw error
    }
  },

  async register(userData, options = {}) {
    try {
      const endpoint = import.meta.env.VITE_REGISTER_ENDPOINT || "/api/auth/register/"
      const response = await api.post(endpoint, userData)

      let currentUserData = null

      if (response.data && !options.skipAutoLogin) {
        const authScheme = import.meta.env.VITE_AUTH_SCHEME || "Token"
        secureStorage.setItem("auth_scheme", authScheme)

        // Extrai tokens da resposta
        const accessToken = response.data.access_token || response.data.access || response.data.token
        const refreshToken = response.data.refresh_token || response.data.refresh

        if (accessToken) {
          secureStorage.setItem("access_token", accessToken)
        }
        if (refreshToken) {
          secureStorage.setItem("refresh_token", refreshToken)
        }

        // Se não veio nenhum token, assumir sessão via cookie
        try {
          if (!accessToken && !refreshToken) {
            secureStorage.setItem("auth_storage", "cookie")
            try { api.defaults.withCredentials = true } catch {}
          }
        } catch {}

        // Tenta buscar dados do usuário
        try {
          currentUserData = await fetchCurrentUserFromApi()
          if (currentUserData) {
            secureStorage.setItem("user", normalizeUser(currentUserData))
          } else {
            secureStorage.removeItem("user")
          }
        } catch (userError) {
          console.warn("Não foi possível carregar dados do usuário após registro:", userError)
          secureStorage.removeItem("user")
          // Fallback: tenta usar token para buscar usuário
          const token = secureStorage.getItem("access_token")
          if (token) {
            try {
              const fallbackUserData = await fetchCurrentUserFromApi()
              currentUserData = fallbackUserData
              if (fallbackUserData) {
                secureStorage.setItem("user", normalizeUser(fallbackUserData))
              }
            } catch (fallbackError) {
              console.warn("Fallback para buscar usuário também falhou:", fallbackError)
            }
          }
        }
      }

      // NOVO: criação automática de Solicitação de Médico quando desired_role=medico
      let medicoApplication = undefined
      try {
        const wantsMedico = String(userData?.desired_role || "").toLowerCase() === "medico"
        const medicoDataOpt = options?.medicoData
        if (wantsMedico && medicoDataOpt) {
          const normalizedUser = normalizeUser(currentUserData || secureStorage.getItem("user") || {})
          const fullName = [normalizedUser?.first_name, normalizedUser?.last_name].filter(Boolean).join(" ") || normalizedUser?.username || ""
          const medicoPayload = {
            ...medicoDataOpt,
            nome: medicoDataOpt.nome || fullName || userData?.first_name || "",
            email: medicoDataOpt.email || normalizedUser?.email || userData?.email || "",
            cpf: medicoDataOpt.cpf || userData?.cpf || "",
            tipo: medicoDataOpt.tipo || "medico",
          }

          try {
            const medResp = await solicitacaoService.criarSolicitacaoMedico(medicoPayload)
            medicoApplication = { success: true, data: medResp }
            // Marca status local para UX do médico
            try {
              const uid = (normalizedUser?.id) || (currentUserData?.id)
              if (uid) localStorage.setItem(`medicoApplicationStatus:${uid}`, "pending")
            } catch {}
          } catch (e) {
            medicoApplication = { success: false, error: e?.response?.data || e?.message || "Não foi possível criar a solicitação de médico." }
          }
        }
      } catch (e) {
        // Não interromper o fluxo de registro se a criação de solicitação falhar
        medicoApplication = { success: false, error: e?.message || "Falha desconhecida ao criar solicitação." }
      }

      // Retorna dados do registro enriquecidos com o resultado da criação da solicitação (se houver)
      if (medicoApplication) {
        return { ...response.data, medicoApplication }
      }
      return response.data
    } catch (error) {
      console.error("Erro no registro:", error)
      throw error
    }
  },

  async logout() {
    try {
      const endpoint = import.meta.env.VITE_LOGOUT_ENDPOINT || "/api/auth/logout/"
      await api.post(endpoint)
    } catch (error) {
      console.warn("Erro ao fazer logout no servidor:", error)
    } finally {
      // Limpa dados locais independentemente do resultado da API
      secureStorage.removeItem("access_token")
      secureStorage.removeItem("refresh_token")
      secureStorage.removeItem("user")
      secureStorage.removeItem("auth_scheme")
      secureStorage.removeItem("auth_storage")
    }
  },

  async forgotPassword(email) {
    const endpoint = import.meta.env.VITE_FORGOT_PASSWORD_ENDPOINT || "/auth/password_reset/"
    // Remetente é sempre definido no backend (DEFAULT_FROM_EMAIL)
    const res = await api.post(endpoint, { email })
    return res?.data ?? res
  },

  getCurrentUser() {
    try {
      const userData = secureStorage.getItem("user")
      return userData ? normalizeUser(userData) : null
    } catch (error) {
      console.error("Erro ao recuperar usuário atual:", error)
      return null
    }
  },

  async refreshCurrentUser() {
    try {
      const userData = await fetchCurrentUserFromApi()
      if (userData) {
        secureStorage.setItem("user", normalizeUser(userData))
        return normalizeUser(userData)
      } else {
        secureStorage.removeItem("user")
        return null
      }
    } catch (error) {
      // Importante: se 401, repropaga para o AuthProvider poder fazer logout
      if (error?.response?.status === 401) {
        throw error
      }
      console.error("Erro ao atualizar dados do usuário:", error)
      return null
    }
  },

  isAuthenticated() {
    const token = secureStorage.getItem("access_token")
    const runtimeStorage = String(secureStorage.getItem("auth_storage") || import.meta.env.VITE_AUTH_STORAGE || "local").toLowerCase()
    // Sessão por cookie: considerar autenticado e deixar rotas buscarem /me quando necessário
    return !!token || runtimeStorage === "cookie"
  },

  async loginWithGoogle(credential) {
    try {
      const endpoint = import.meta.env.VITE_GOOGLE_LOGIN_ENDPOINT || "/api/auth/google/"
      const response = await api.post(endpoint, { credential })

      if (response.data) {
        const authScheme = import.meta.env.VITE_AUTH_SCHEME || "Token"
        secureStorage.setItem("auth_scheme", authScheme)

        // Extrai tokens da resposta
        const accessToken = response.data.access_token || response.data.access || response.data.token
        const refreshToken = response.data.refresh_token || response.data.refresh

        if (accessToken) {
          secureStorage.setItem("access_token", accessToken)
        }
        if (refreshToken) {
          secureStorage.setItem("refresh_token", refreshToken)
        }

        // Se não veio token, assumir cookie-mode
        try {
          if (!accessToken && !refreshToken) {
            secureStorage.setItem("auth_storage", "cookie")
            try { api.defaults.withCredentials = true } catch {}
          }
        } catch {}

        // Tenta buscar dados do usuário
        try {
          const userData = await fetchCurrentUserFromApi()
          if (userData) {
            secureStorage.setItem("user", normalizeUser(userData))
          } else {
            secureStorage.removeItem("user")
          }
        } catch (userError) {
          console.warn("Não foi possível carregar dados do usuário:", userError)
          secureStorage.removeItem("user")
        }

        return response.data
      }

      throw new Error("Resposta de login com Google inválida")
    } catch (error) {
      console.error("Erro no login com Google:", error)
      throw error
    }
  },
}

// Helper: busca o usuário atual usando o endpoint configurado
async function fetchCurrentUserFromApi() {
  // Usa o endpoint configurado no .env
  const meEndpoint = import.meta.env.VITE_ME_ENDPOINT || "/api/auth/users/me/"
  
  // Não suprimir erros aqui: deixar o chamador decidir (para tratar 401)
  const res = await api.get(meEndpoint)
  return res.data
}
