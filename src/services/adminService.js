import api from "./api"

export const adminService = {
  async getDashboard() {
    const response = await api.get("/admin/dashboard/")
    return response.data
  },

  async getSolicitacoes(params = {}) {
    const candidates = []
    const envAdmin = import.meta.env.VITE_ADMIN_SOLICITACOES_ENDPOINT
    const envGeneric = import.meta.env.VITE_SOLICITACOES_ENDPOINT

    if (envAdmin) candidates.push(envAdmin)
    candidates.push("/admin/solicitacoes/")
    if (envGeneric) candidates.push(envGeneric)
    candidates.push("/solicitacoes/")

    const normalized = normalizeParams(params)

    let lastError
    for (const raw of candidates) {
      const endpoint = ensureTrailingSlash(raw)
      try {
        const response = await api.get(endpoint, { params: normalized })
        const data = response.data
        // Normaliza diferentes formatos de resposta
        const list = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.data?.results)
          ? data.data.results
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : []
        return list.map(normalizeSolicitacaoItem)
      } catch (err) {
        if (err?.response?.status === 404) {
          lastError = err
          continue
        }
        throw err
      }
    }
    throw lastError || new Error("Nenhum endpoint válido para listar solicitações encontrado.")
  },

  async getSolicitacao(id) {
    const response = await api.get(`/admin/solicitacoes/${id}/`)
    return response.data
  },

  async aprovarSolicitacao(id, observacoes = "") {
    const response = await api.post(`/admin/solicitacoes/${id}/aprovar/`, {
      observacoes,
    })
    return response.data
  },

  async rejeitarSolicitacao(id, motivo) {
    const response = await api.post(`/admin/solicitacoes/${id}/rejeitar/`, {
      motivo,
    })
    return response.data
  },

  async getAuditoria(params = {}) {
    const response = await api.get("/admin/auditoria/", { params })
    return response.data
  },

  // NOVO: usa variáveis de ambiente e fallbacks
  async getUsuarios(params = {}) {
    const candidates = []
    const envAdmin = import.meta.env.VITE_ADMIN_USUARIOS_ENDPOINT
    const envUsers = import.meta.env.VITE_USER_PROFILE_ENDPOINT

    if (envAdmin) candidates.push(envAdmin)
    candidates.push("/admin/usuarios/")
    if (envUsers) candidates.push(envUsers)
    candidates.push("/users/")

    const normalized = normalizeParams(params)

    let lastError
    for (const raw of candidates) {
      const endpoint = ensureTrailingSlash(raw)
      try {
        const res = await api.get(endpoint, { params: normalized })
        return res.data
      } catch (err) {
        if (err?.response?.status === 404) {
          lastError = err
          continue
        }
        throw err
      }
    }
    throw lastError || new Error("Nenhum endpoint válido para usuários encontrado.")
  },

  // NOVO: usa variáveis de ambiente e fallbacks
  async getClinicas(params = {}) {
    const candidates = []
    const envAdmin = import.meta.env.VITE_ADMIN_CLINICAS_ENDPOINT
    const envClinicas = import.meta.env.VITE_CLINICAS_ENDPOINT

    if (envAdmin) candidates.push(envAdmin)
    candidates.push("/admin/clinicas/")
    if (envClinicas) candidates.push(envClinicas)
    candidates.push("/clinicas/")

    const normalized = normalizeParams(params)

    let lastError
    for (const raw of candidates) {
      const endpoint = ensureTrailingSlash(raw)
      try {
        const res = await api.get(endpoint, { params: normalized })
        return res.data
      } catch (err) {
        if (err?.response?.status === 404) {
          lastError = err
          continue
        }
        throw err
      }
    }
    throw lastError || new Error("Nenhum endpoint válido para clínicas encontrado.")
  },

  // NOVO: Atualiza um usuário (tenta /users/{id}/editar/ e fallbacks)
  async updateUsuario(id, payload = {}) {
    if (!id) throw new Error("ID do usuário é obrigatório.")

    const candidates = [
      `/users/${id}/editar/`,
      `/admin/usuarios/${id}/editar/`,
      `/users/${id}/`,
      `/admin/usuarios/${id}/`,
    ]

    let lastError
    for (const raw of candidates) {
      const endpoint = ensureTrailingSlash(raw)
      try {
        const res = await api.patch(endpoint, payload)
        return res.data
      } catch (err) {
        if (err?.response?.status === 404) {
          lastError = err
          continue
        }
        if (err?.response?.status === 405) {
          lastError = err
          continue
        }
        throw err
      }
    }
    throw lastError || new Error("Nenhum endpoint válido para editar usuário encontrado.")
  },

  // NOVO: Remoção em massa de usuários
  async removerUsuariosEmMassa(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('Informe uma lista "ids" com ao menos um ID.')
    }
    const candidates = [
      "/users/remover-em-massa/",
      "/admin/usuarios/remover-em-massa/",
    ]

    let lastError
    for (const raw of candidates) {
      const endpoint = ensureTrailingSlash(raw)
      try {
        const res = await api.post(endpoint, { ids })
        return res.data
      } catch (err) {
        if (err?.response?.status === 404) {
          lastError = err
          continue
        }
        throw err
      }
    }
    throw lastError || new Error("Nenhum endpoint válido para remoção em massa encontrado.")
  },
  // NOVO: criação de usuário (inclui secretaria)
  async createUsuario(payload = {}) {
    const baseData = { ...payload }
    const email = String(baseData.email || "").trim()
    const first_name = baseData.first_name || baseData.nome || ""
    const last_name = baseData.last_name || baseData.sobrenome || ""
    const role = (baseData.role || baseData.tipo || baseData.perfil || "").toString().toLowerCase()
    const password = baseData.password || baseData.senha || ""

    if (!email) throw new Error("E-mail é obrigatório.")

    // Gera username se não foi fornecido
    let username = baseData.username
    if (!username) {
      const local = email.split("@")[0].replace(/[^a-zA-Z0-9_.-]/g, "") || "user"
      const rand = Math.random().toString(36).slice(2, 6)
      username = `${local}_${rand}`
    }

    // Tentar múltiplos endpoints
    const envs = [
      import.meta.env.VITE_ADMIN_CREATE_USER_ENDPOINT,
      import.meta.env.VITE_USERS_ENDPOINT,
      import.meta.env.VITE_AUTH_REGISTER_ENDPOINT,
    ]
      .map((s) => (s ? s.toString().trim() : ""))
      .filter(Boolean)

    const candidates = [...envs, "/admin/usuarios/", "/users/", "/auth/register/"]

    // Enviar role em chaves alternativas para cobrir backends distintos
    const bodyCommon = {
      first_name,
      last_name,
      email,
      password,
      username,
      role: role || undefined,
      tipo: role || undefined,
      perfil: role || undefined,
    }

    let lastError
    for (const raw of candidates) {
      const endpoint = ensureTrailingSlash(raw)
      try {
        const res = await api.post(endpoint, bodyCommon)
        return res.data
      } catch (err) {
        // 404/405 -> tenta próximo; 400 pode ser validação, então tentamos os demais antes de abortar
        const st = err?.response?.status
        if (st === 404 || st === 405) {
          lastError = err
          continue
        }
        // Alguns backends podem exigir PUT; tentamos PUT também
        try {
          const resPut = await api.put(endpoint, bodyCommon)
          return resPut.data
        } catch {}
        lastError = err
      }
    }
    throw lastError || new Error("Nenhum endpoint válido para criação de usuário encontrado.")
  },
}

// Helpers adicionados no final do arquivo (se já não existirem)
function ensureTrailingSlash(path) {
  if (!path) return path
  return path.endsWith("/") ? path : `${path}/`
}

function normalizeParams(params = {}) {
  const p = { ...params }
  // Duplicamos limit/page_size para cobrir diferentes backends (DRF vs limit/offset)
  if (p.limit != null && p.page_size == null) p.page_size = p.limit
  if (p.page_size != null && p.limit == null) p.limit = p.page_size
  Object.keys(p).forEach((k) => {
    if (p[k] === undefined || p[k] === null || p[k] === "") delete p[k]
  })
  return p
}

// NOVO: normaliza os campos de cada item para o que a UI espera
function normalizeSolicitacaoItem(it = {}) {
  return {
    id: it.id || it.pk || it.uuid || it.codigo || it.codigo_id || 0,
    tipo: String(it.tipo || it.type || it.kind || "medico").toLowerCase(),
    nome: it.nome || it.name || it.usuario?.nome || it.user?.name || it.medico?.nome || it.clinica?.nome || "—",
    email: it.email || it.usuario?.email || it.user?.email || it.medico?.user?.email || it.clinica?.email || "—",
    crm: it.crm || it.medico?.crm || it.crm_numero || "",
    cnpj: it.cnpj || it.clinica?.cnpj || "",
    responsavel: it.responsavel || it.responsavel_tecnico || it.clinica?.responsavel || "",
    // Normaliza status PT-BR -> EN para casar com os filtros/abas
    status: (() => {
      const raw = (it.status || it.situacao || it.state || "pending").toString().toLowerCase()
      const map = {
        pendente: "pending",
        "em análise": "pending",
        "em analise": "pending",
        em_analise: "pending",
        aprovado: "approved",
        aprovada: "approved",
        rejeitado: "rejected",
        rejeitada: "rejected",
      }
      return map[raw] || raw
    })(),
    dataEnvio:
      it.dataEnvio || it.created_at || it.createdAt || it.data_criacao || it.submitted_at || new Date().toISOString(),
    documentos: Array.isArray(it.documentos) ? it.documentos : it.documents || [],
    urgencia: String(it.urgencia || it.priority || "normal").toLowerCase(),
    observacoes: it.observacoes || it.notes || it.comentarios || "",
    aprovadoPor: it.aprovadoPor || it.approved_by || "",
    rejeitadoPor: it.rejeitadoPor || it.rejected_by || "",
    motivoRejeicao: it.motivoRejeicao || it.motivo || it.reason || "",
    especialidade: it.especialidade || it.medico?.especialidade || "",
  }
}
