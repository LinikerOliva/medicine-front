import api from "./api"
import { authService } from "./authService"

export const medicoService = {
  // Resolve o perfil do médico evitando 404 desnecessários e mapeando a partir do usuário
  async getPerfil() {
    const medBaseRaw = import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/"
    const medBase = medBaseRaw.endsWith("/") ? medBaseRaw : `${medBaseRaw}/`

    // Flags para controlar tentativas de endpoints "me" (desativadas por padrão)
    const MEDICOS_ME_ENABLED = String(import.meta.env.VITE_MEDICOS_ME_ENABLED || "").toLowerCase() === "true"
    const USER_ME_ENABLED = String(import.meta.env.VITE_USER_ME_ENABLED || "").toLowerCase() === "true"

    // 0) Prioriza usuário do localStorage (evita várias tentativas 404)
    let localUser = authService.getCurrentUser()
    // NOVO: se não houver user salvo, tenta buscá-lo no backend
    if (!localUser?.id) {
      try {
        const refreshed = await authService.refreshCurrentUser()
        if (refreshed?.id) localUser = refreshed
      } catch {}
    }
    if (localUser?.id) {
      // Tentar diferentes chaves de filtro por usuário (configuráveis por env)
      const keysRaw = (import.meta.env.VITE_MEDICOS_USER_FILTER_KEYS || "user,user__id,user_id,usuario,usuario_id")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      for (const key of keysRaw) {
        try {
          const res = await api.get(medBase, { params: { [key]: localUser.id } })
          const items = Array.isArray(res.data?.results) ? res.data.results : res.data
          if (items?.[0]) return items[0]
        } catch {}
      }
    }

    // 1) Tenta endpoint direto /medicos/me/ (caso o backend suporte) — somente se habilitado por env
    if (MEDICOS_ME_ENABLED) {
      try {
        const res = await api.get(`${medBase}me/`)
        return res.data
      } catch (err) {
        if (err?.response?.status !== 404) throw err
      }
    }

    // 2) Descobrir o usuário atual via endpoints comuns de "me" — somente se habilitado por env
    let user = null
    if (USER_ME_ENABLED) {
      const userCandidates = []
      const envUser = (import.meta.env.VITE_USER_PROFILE_ENDPOINT || "").trim()
      if (envUser) {
        if (envUser.includes("/me")) {
          userCandidates.push(envUser)
        } else {
          const base = envUser.endsWith("/") ? envUser : `${envUser}/`
          userCandidates.push(`${base}me/`)
        }
      }
      userCandidates.push("/users/me/")
      userCandidates.push("/auth/user/")

      for (const url of userCandidates) {
        try {
          const res = await api.get(url)
          user = res.data
          // Alguns backends retornam { results: [...] } ou array diretamente
          if (user && !user.id) {
            const maybe = Array.isArray(user?.results)
              ? user.results[0]
              : Array.isArray(user)
              ? user[0]
              : null
            if (maybe?.id) user = maybe
          }
          if (user?.id) break
        } catch (err) {
          // continua tentando próximos
        }
      }
    }

    // 3) Como fallback final, lista /medicos/ e tenta casar com user atual (se disponível)
    try {
      const res = await api.get(medBase)
      const items = Array.isArray(res.data?.results) ? res.data.results : res.data
      if (Array.isArray(items) && items.length) {
        // Heurística: procurar por user.id
        const uid = user?.id || authService.getCurrentUser()?.id
        if (uid) {
          const found = items.find((m) => m?.user?.id === uid || m?.usuario?.id === uid)
          if (found) return found
        }
        return items[0]
      }
    } catch {}

    return null
  },

  async getPacientes(params = {}) {
    const endpoint = import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/"
    const response = await api.get(endpoint, { params })
    return response.data
  },

  async getPacientesVinculados(medicoId) {
    const medBaseRaw = import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/"
    const medBase = medBaseRaw.endsWith("/") ? medBaseRaw : `${medBaseRaw}/`
    const res = await api.get(`${medBase}${medicoId}/pacientes/`)
    return res.data
  },

  async getConsultas(params = {}) {
    const endpoint = import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/"
    const response = await api.get(endpoint, { params })
    return response.data
  },

  // Busca consultas do médico aceitando sinônimos (date/data, medico/medico_id) e resolvendo o ID do médico se necessário
  async getConsultasDoMedico(params = {}) {
    const perfil = await this.getPerfil()

    // Resolver ID do médico
    let medicoId = null
    if (perfil?.medico?.id) medicoId = perfil.medico.id
    else if (perfil && typeof perfil === "object" && "crm" in perfil) medicoId = perfil.id // objeto de Médico

    // Se ainda não temos id, tente buscar pelo usuário
    if (!medicoId) {
      const uid = perfil?.user?.id || perfil?.id
      if (uid) {
        try {
          const medBaseRaw = import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/"
          const medBase = medBaseRaw.endsWith("/") ? medBaseRaw : `${medBaseRaw}/`
          const keysRaw = (import.meta.env.VITE_MEDICOS_USER_FILTER_KEYS || "user,user__id,user_id,usuario,usuario_id")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
          for (const key of keysRaw) {
            try {
              const res = await api.get(medBase, { params: { [key]: uid } })
              const items = Array.isArray(res.data?.results) ? res.data.results : res.data
              if (items?.[0]?.id) {
                medicoId = items[0].id
                break
              }
            } catch {}
          }
        } catch {}
      }
    }

    // Montar parâmetros finais com sinônimos
    const finalParams = { ...params }
    if (medicoId && !finalParams.medico && !finalParams.medico_id) {
      finalParams.medico = medicoId
      finalParams.medico_id = medicoId
    }

    // Normalizar data
    const dateVal = finalParams.date || finalParams.data || finalParams.dia
    if (dateVal) {
      finalParams.date = dateVal
      finalParams.data = dateVal
      finalParams.dia = dateVal
      // Alguns backends usam lookup __date
      finalParams["data__date"] = dateVal
    }

    const endpoint = import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/"
    const response = await api.get(endpoint, { params: finalParams })
    return response.data
  },

  // Busca consultas de hoje; se não for passado médico, resolve automaticamente
  async getConsultasHoje(medicoId) {
    const medBaseRaw = import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/"
    const medBase = medBaseRaw.endsWith("/") ? medBaseRaw : `${medBaseRaw}/`

    let mid = medicoId
    if (!mid) {
      const perfil = await this.getPerfil()
      if (perfil?.medico?.id) mid = perfil.medico.id
      else if (perfil && typeof perfil === "object" && "crm" in perfil) mid = perfil.id
      // último recurso: buscar por usuário
      if (!mid) {
        const uid = perfil?.user?.id || perfil?.id
        if (uid) {
          try {
            const keysRaw = (import.meta.env.VITE_MEDICOS_USER_FILTER_KEYS || "user,user__id,user_id,usuario,usuario_id")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
            for (const key of keysRaw) {
              try {
                const res = await api.get(medBase, { params: { [key]: uid } })
                const items = Array.isArray(res.data?.results) ? res.data.results : res.data
                if (items?.[0]?.id) {
                  mid = items[0].id
                  break
                }
              } catch {}
            }
          } catch {}
        }
      }
    }

    const USE_MED_CONSULTAS_HOJE = String(import.meta.env.VITE_MEDICOS_CONSULTAS_HOJE_ENABLED ?? "false").toLowerCase() === "true"
    // Tenta endpoint dedicado /medicos/{id}/consultas_hoje/ somente se habilitado por env
    if (mid && USE_MED_CONSULTAS_HOJE) {
      try {
        const res = await api.get(`${medBase}${mid}/consultas_hoje/`)
        return res.data
      } catch (err) {
        // continua para o fallback
      }
    }

    // Fallback: filtra por hoje no /consultas/ com sinônimos (usa data LOCAL, não UTC)
    const d = new Date()
    const pad = (n) => String(n).padStart(2, "0")
    const todayLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const data = await this.getConsultasDoMedico({ date: todayLocal })
    return data
  },

  async getDashboard() {
    const envEndpoint = import.meta.env.VITE_MEDICO_DASHBOARD_ENDPOINT
    if (envEndpoint) {
      const endpoint = envEndpoint.endsWith("/") ? envEndpoint : `${envEndpoint}/`
      try {
        const response = await api.get(endpoint)
        return response.data
      } catch (err) {
        // se não for 404, propaga; se for 404, cai para o fallback
        if (err?.response?.status && err.response.status !== 404) throw err
      }
    }

    // Fallback: montar dados a partir das consultas do dia (apenas do médico logado)
    try {
      const d = new Date()
      const pad = (n) => String(n).toString().padStart(2, "0")
      const todayLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

      // Usa o método que já resolve o médico e aplica sinônimos de filtros
      const consultasData = await this.getConsultasDoMedico({ date: todayLocal })
      const consultas = Array.isArray(consultasData)
        ? consultasData
        : Array.isArray(consultasData?.results)
        ? consultasData.results
        : []

      const proximas = Array.isArray(consultas)
        ? consultas.map((c) => ({
            id: c.id || c.consulta_id || c.uuid,
            paciente: c.paciente,
            data_hora: c.data_hora,
            status: c.status,
          }))
        : []

      return { proximas }
    } catch (err) {
      // Fallback final
      return { proximas: [] }
    }
  },

  // NOVO: iniciar uma consulta (action do backend)
  async iniciarConsulta(consultaId) {
    if (!consultaId) throw new Error("consultaId é obrigatório")
    const base = "/consultas/"
    const candidates = [
      { method: "post", url: `${base}${consultaId}/iniciar/`, data: undefined },
      { method: "post", url: `${base}${consultaId}/start/`, data: undefined },
      { method: "patch", url: `${base}${consultaId}/`, data: { status: "em_andamento" } },
      { method: "put", url: `${base}${consultaId}/iniciar/`, data: undefined },
    ]
    let lastErr = null
    for (const c of candidates) {
      try {
        const res = await api[c.method](c.url, c.data)
        return res.data
      } catch (e) {
        lastErr = e
      }
    }
    throw lastErr || new Error("Não foi possível iniciar a consulta")
  },

  // NOVO: finalizar uma consulta (action do backend)
  async finalizarConsulta(consultaId) {
    if (!consultaId) throw new Error("consultaId é obrigatório")
    const base = "/consultas/"
    const url = `${base}${consultaId}/finalizar/`
    const res = await api.post(url)
    return res.data
  },

  // NOVO: sumarizar consulta via backend (quando disponível)
  async sumarizarConsulta(consultaId, payload = {}) {
    if (!consultaId) throw new Error("consultaId é obrigatório")
    const base = "/consultas/"
    const candidates = [
      `${base}${consultaId}/sumarizar/`,
      `${base}${consultaId}/resumir/`,
      `${base}${consultaId}/summary/`,
    ]
    let lastErr = null
    for (const url of candidates) {
      try {
        const { data } = await api.post(url, payload)
        return data
      } catch (e) {
        lastErr = e
      }
    }
    throw lastErr || new Error("Endpoint de sumarização não disponível")
  },

  // Criar prontuário (via consulta_id write-only no serializer)
  async criarProntuario(payload) {
    const endpointBase = (import.meta.env.VITE_PRONTUARIOS_ENDPOINT || "/prontuarios/").replace(/\/?$/, "/")

    // 1) Normaliza e remove campos vazios para evitar 400 por validação
    const p0 = { ...(payload || {}) }
    const normalized = {}
    for (const [k, v] of Object.entries(p0)) {
      if (v === undefined || v === null) continue
      if (typeof v === "string" && v.trim() === "") continue
      normalized[k] = typeof v === "string" ? v.trim() : v
    }

    // Aceita sinônimos para consulta
    const cid = normalized.consulta_id || normalized.consulta
    if (cid) {
      normalized.consulta_id = cid
      normalized.consulta = cid
    }

    // 2) Candidatos de endpoints e métodos
    const candidates = [
      { method: "post", url: endpointBase },
      { method: "put", url: endpointBase },
      { method: "patch", url: endpointBase },
    ]

    // Alguns backends usam singular
    const singular = endpointBase.replace(/prontuarios\/?$/i, "prontuario/")
    if (singular !== endpointBase) {
      candidates.push({ method: "post", url: singular })
      candidates.push({ method: "put", url: singular })
      candidates.push({ method: "patch", url: singular })
    }

    // 3) Tenta enviar; se 400/422, tenta payload minimal com chaves alternativas comuns
    let lastErr = null
    for (const c of candidates) {
      try {
        const { data } = await api[c.method](c.url, normalized)
        return data
      } catch (e) {
        const st = e?.response?.status
        if (st && [400, 422].includes(st)) {
          // payload minimal
          const minimal = {}
          if (cid) { minimal.consulta_id = cid; minimal.consulta = cid }
          const q = normalized.queixa_principal || normalized.queixa
          const h = normalized.historia_doenca_atual || normalized.historia
          const d = normalized.diagnostico_principal || normalized.diagnostico
          const co = normalized.conduta || normalized.plano
          const meds = normalized.medicamentos_uso || normalized.medicamentos
          if (q) minimal.queixa_principal = q
          if (h) minimal.historia_doenca_atual = h
          if (d) minimal.diagnostico_principal = d
          if (co) minimal.conduta = co
          if (meds) minimal.medicamentos_uso = meds
          if (normalized.alergias) minimal.alergias = normalized.alergias
          if (normalized.exames_solicitados) minimal.exames_solicitados = normalized.exames_solicitados
          if (normalized.data_retorno) minimal.data_retorno = normalized.data_retorno
          try {
            const { data } = await api[c.method](c.url, minimal)
            return data
          } catch (e2) {
            lastErr = e2
          }
        } else if (st === 405) {
          // tenta outros métodos
          lastErr = e
          continue
        } else if (st === 404) {
          lastErr = e
          continue
        } else {
          lastErr = e
          break
        }
      }
    }

    if (lastErr) throw lastErr
    throw new Error("Falha ao criar prontuário: nenhum endpoint compatível encontrado.")
  },

  // NOVO: criar receita no backend (persistência em banco)
  async criarReceita(payload = {}) {
    const baseReceitas = (import.meta.env.VITE_RECEITAS_ENDPOINT || "/receitas/").replace(/\/?$/, "/")
    const basePacientes = (import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/").replace(/\/?$/, "/")
    const baseConsultas = (import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/").replace(/\/?$/, "/")
    const VERBOSE = String(import.meta.env.VITE_VERBOSE_ENDPOINT_LOGS ?? "false").toLowerCase() === "true"

    // Normaliza campos aceitando sinônimos (compat com backends variados)
    const p0 = { ...payload }
    const pacienteId = p0.paciente_id || p0.paciente
    const consultaId = p0.consulta_id || p0.consulta
    const normalized = { ...p0 }
    if (!normalized.paciente_id && pacienteId) normalized.paciente_id = pacienteId
    if (!normalized.paciente && pacienteId) normalized.paciente = pacienteId
    if (!normalized.consulta_id && consultaId) normalized.consulta_id = consultaId
    if (!normalized.consulta && consultaId) normalized.consulta = consultaId
    if (!normalized.medicamentos && p0.medicamento) normalized.medicamentos = p0.medicamento
    if (!normalized.medicamento && p0.medicamentos) normalized.medicamento = p0.medicamentos
    if (!normalized.validade && p0.validade_receita) normalized.validade = p0.validade_receita

    // Resolve automaticamente o ID do médico quando ausente
    try {
      const midResolved = normalized.medico_id || normalized.medico || await this._resolveMedicoId().catch(() => null)
      if (midResolved) {
        if (!normalized.medico_id) normalized.medico_id = midResolved
        if (!normalized.medico) normalized.medico = midResolved
      }
    } catch {}

    if (!normalized.consulta_id && !normalized.consulta && (normalized.paciente_id || normalized.paciente)) {
      try {
        const pid = normalized.paciente_id || normalized.paciente
        const mid = normalized.medico_id || normalized.medico || null
        const preferDate = (() => {
          const today = new Date()
          const y = today.getFullYear()
          const m = String(today.getMonth() + 1).padStart(2, "0")
          const d = String(today.getDate()).padStart(2, "0")
          return `${y}-${m}-${d}`
        })()
        const ensured = await this._ensureConsultaId(pid, mid, preferDate)
        if (ensured) {
          normalized.consulta_id = ensured
          normalized.consulta = ensured
          if (VERBOSE) { try { console.debug("[medicoService.criarReceita] consulta_id resolvido automaticamente:", ensured) } catch {} }
        }
      } catch (e) {
        if (VERBOSE) { try { console.warn("[medicoService.criarReceita] não foi possível resolver consulta_id automaticamente", e?.response?.status) } catch {} }
      }
    }

    const candidates = []
    const envCreate = (import.meta.env.VITE_CRIAR_RECEITA_ENDPOINT || "").trim()
      if (envCreate) candidates.push(envCreate)

    // PRIORIDADE: rotas gerais primeiro (evita 404 barulhento em /pacientes/:id/receitas/)
    candidates.push(baseReceitas)
    candidates.push(`${baseReceitas}criar/`)
    candidates.push(`${baseReceitas}create/`)

    // Variações singulares e nomes alternativos comuns em backends
    const singularBase = baseReceitas.replace(/receitas\/?$/i, "receita/")
    const altBases = Array.from(new Set([
      singularBase,
      "/receita/",
      "/meu_app_receita/",
    ].filter(Boolean)))
    for (const b of altBases) {
      const bb = b.replace(/\/?$/, "/")
      candidates.push(bb)
      candidates.push(`${bb}criar/`)
      candidates.push(`${bb}create/`)
    }

    // Depois, rotas específicas por recurso (caso o backend as ofereça)
    if (consultaId) candidates.push(`${baseConsultas}${consultaId}/receitas/`)
    if (pacienteId) candidates.push(`${basePacientes}${pacienteId}/receitas/`)

    if (VERBOSE) {
      try { console.debug("[medicoService.criarReceita] payload:", normalized) } catch {}
      try { console.debug("[medicoService.criarReceita] candidatos:", candidates) } catch {}
    }

    let lastErr = null
    let lastTried = null
    const retriedMinimal = new Set()
    for (const raw of candidates) {
      if (!raw) continue
      const url = raw.endsWith("/") ? raw : `${raw}/`
      const methods = ["post", "put", "patch"]
      for (const m of methods) {
        lastTried = `${m.toUpperCase()} ${url}`
        try {
          if (VERBOSE) { try { console.debug("[medicoService.criarReceita] tentando:", lastTried) } catch {} }
          const { data } = await api[m](url, normalized)
          if (VERBOSE) { try { console.debug("[medicoService.criarReceita] sucesso:", lastTried, "→", data) } catch {} }
          return data
        } catch (e) {
          const st = e?.response?.status
          if (VERBOSE) {
            try { console.warn("[medicoService.criarReceita] falhou:", lastTried, "status=", st, "detail=", e?.response?.data || e?.message) } catch {}
          }
          // Fallback: em caso de validação 400/422, tentar um payload minimal e nomes alternativos
          if (st && [400, 422].includes(st)) {
            const key = `${m}:${url}`
            if (!retriedMinimal.has(key)) {
              retriedMinimal.add(key)
              const minimal = {}
              const pid = normalized.paciente_id || normalized.paciente
              const mid2 = normalized.medico_id || normalized.medico
              const meds = normalized.medicamentos || normalized.medicamento
              const val = normalized.validade || normalized.validade_receita
              if (pid) { minimal.paciente = pid; minimal.paciente_id = pid }
              if (mid2) { minimal.medico = mid2; minimal.medico_id = mid2 }
              if (meds) { minimal.medicamentos = meds; minimal.medicamento = meds }
              if (normalized.posologia) minimal.posologia = normalized.posologia
              if (val) { minimal.validade = val }
              if (normalized.observacoes) minimal.observacoes = normalized.observacoes
              if (normalized.consulta_id || normalized.consulta) {
                const cid = normalized.consulta_id || normalized.consulta
                minimal.consulta = cid
                minimal.consulta_id = cid
              }
              try {
                if (VERBOSE) { try { console.debug("[medicoService.criarReceita] retry minimal:", m.toUpperCase(), url, minimal) } catch {} }
                const { data } = await api[m](url, minimal)
                if (VERBOSE) { try { console.debug("[medicoService.criarReceita] sucesso (minimal):", m.toUpperCase(), url, data) } catch {} }
                return data
              } catch (e2) {
                if (VERBOSE) { try { console.warn("[medicoService.criarReceita] falhou (minimal):", m.toUpperCase(), url, e2?.response?.status, e2?.response?.data || e2?.message) } catch {} }
                // Enriquecer mensagem mantendo response/config do Axios
                try {
                  const body = e2?.response?.data
                  const detail = (typeof body === "string" && body) || body?.detail || body?.message || e2?.message || "Erro desconhecido"
                  const bodyStr = body && typeof body === "object" ? ` | body=${JSON.stringify(body)}` : (typeof body === "string" ? ` | body=${body}` : "")
                  e2.message = `Falha ao criar receita (minimal, última tentativa: ${lastTried || ""}) ⇒ [${st || ""}] ${detail}${bodyStr}`
                } catch {}
                throw e2
              }
            }
            // Se já tentou minimal neste endpoint, ainda assim enriquecer a mensagem antes de propagar
            try {
              const body = e?.response?.data
              const detail = (typeof body === "string" && body) || body?.detail || body?.message || e?.message || "Erro desconhecido"
              const bodyStr = body && typeof body === "object" ? ` | body=${JSON.stringify(body)}` : (typeof body === "string" ? ` | body=${body}` : "")
              e.message = `Falha ao criar receita (última tentativa: ${lastTried || ""}) ⇒ [${st || ""}] ${detail}${bodyStr}`
            } catch {}
          }
          if (st === 404) { lastErr = e; break }
          if (st === 405) { lastErr = e; continue }
          if (st === 401) throw e
          if (st && [400, 422].includes(st)) throw e
          lastErr = e; break
        }
      }
    }
    if (lastErr) {
      const st = lastErr?.response?.status
      const body = lastErr?.response?.data
      const detail = (typeof body === "string" && body) || body?.detail || body?.message || lastErr?.message || "Erro desconhecido"
      const bodyStr = body && typeof body === "object" ? ` | body=${JSON.stringify(body)}` : ""
      throw new Error(`Falha ao criar receita (última tentativa: ${lastTried || ""}) ⇒ [${st || ""}] ${detail}${bodyStr}`)
    }
    throw new Error("Falha ao criar receita: nenhum endpoint compatível encontrado.")
  },

  // Busca simplificada de pacientes por nome
  async buscarPacientes(query) {
    const endpoint = import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/"
    const response = await api.get(endpoint, { params: { search: query } })
    return response.data
  },

  // NOVO: atualizar dados do paciente por ID
  async atualizarPacienteById(id, payload) {
    if (!id) throw new Error("id do paciente é obrigatório")
    const baseRaw = import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/"
    const base = baseRaw.endsWith("/") ? baseRaw : `${baseRaw}/`
    const res = await api.patch(`${base}${id}/`, payload)
    return res.data
  },

  // =============================
  // NOVO: Certificado Digital do Médico
  // =============================

  // Helper para resolver ID do médico atual
  async _resolveMedicoId() {
    try {
      const perfil = await this.getPerfil()
      if (perfil?.medico?.id) return perfil.medico.id
      if (perfil?.id && (perfil.crm || perfil.matricula || perfil.especialidade)) return perfil.id
      // Tentar via usuário
      const uid = perfil?.user?.id || authService.getCurrentUser()?.id
      if (!uid) return null
      const medBaseRaw = import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/"
      const medBase = medBaseRaw.endsWith("/") ? medBaseRaw : `${medBaseRaw}/`
      const keysRaw = (import.meta.env.VITE_MEDICOS_USER_FILTER_KEYS || "user,user__id,user_id,usuario,usuario_id")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      for (const key of keysRaw) {
        try {
          const res = await api.get(medBase, { params: { [key]: uid } })
          const items = Array.isArray(res.data?.results) ? res.data.results : res.data
          if (items?.[0]?.id) return items[0].id
        } catch {}
      }
    } catch {}
    return null
  },

  // NOVO helper: garantir consulta_id existente; busca por uma consulta do dia e cria se necessário
  async _ensureConsultaId(pacienteId, medicoId = null, preferDate = null) {
    try {
      if (!pacienteId) return null
      const VERBOSE = String(import.meta.env.VITE_VERBOSE_ENDPOINT_LOGS ?? "false").toLowerCase() === "true"

      // Data preferida (YYYY-MM-DD)
      const day = (() => {
        if (preferDate && /^\d{4}-\d{2}-\d{2}$/.test(String(preferDate))) return preferDate
        const d = new Date()
        const pad = (n) => String(n).padStart(2, "0")
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      })()

      const baseConsultas = (import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/").replace(/\/?$/, "/")

      // 1) Tentar localizar consulta existente para o paciente (e médico, se disponível) no dia
      try {
        const params = {
          paciente: pacienteId,
          paciente_id: pacienteId,
          date: day,
          data: day,
          dia: day,
          "data__date": day,
        }
        const mid = medicoId || (await this._resolveMedicoId().catch(() => null))
        if (mid) {
          params.medico = mid
          params.medico_id = mid
        }
        const res = await api.get(baseConsultas, { params })
        const items = Array.isArray(res.data?.results) ? res.data.results : res.data
        if (Array.isArray(items)) {
          const found = items.find((c) => c?.id || c?.consulta_id || c?.uuid)
          if (found) {
            const cid = found.id || found.consulta_id || found.uuid
            if (VERBOSE) { try { console.debug("[_ensureConsultaId] encontrada consulta existente:", cid) } catch {} }
            return cid
          }
        }
      } catch (e1) {
        if (VERBOSE) { try { console.warn("[_ensureConsultaId] falha ao buscar consulta existente:", e1?.response?.status) } catch {} }
      }

      // 2) Não existe: tentar criar uma consulta mínima
      try {
        const mid = medicoId || (await this._resolveMedicoId().catch(() => null))
        const body = {
          paciente: pacienteId,
          paciente_id: pacienteId,
          data: day,
          date: day,
          dia: day,
          "data__date": day,
          data_hora: `${day}T00:00:00`,
        }
        if (mid) {
          body.medico = mid
          body.medico_id = mid
        }

        const endpoints = [
          baseConsultas,
          `${baseConsultas}criar/`,
          `${baseConsultas}create/`,
        ]

        for (const urlRaw of endpoints) {
          const url = urlRaw.endsWith("/") ? urlRaw : `${urlRaw}/`
          try {
            if (VERBOSE) { try { console.debug("[_ensureConsultaId] criando consulta em:", url, body) } catch {} }
            const { data } = await api.post(url, body)
            const cid = data?.id || data?.consulta_id || data?.uuid
            if (cid) {
              if (VERBOSE) { try { console.debug("[_ensureConsultaId] consulta criada:", cid) } catch {} }
              return cid
            }
          } catch (e2) {
            const st = e2?.response?.status
            if (VERBOSE) { try { console.warn("[_ensureConsultaId] falha ao criar em", url, st, e2?.response?.data || e2?.message) } catch {} }
            if ([401, 404, 405].includes(st)) continue // tenta próximo endpoint
            // para 400/422 tenta próximo também
          }
        }
      } catch (eCreate) {
        if (VERBOSE) { try { console.warn("[_ensureConsultaId] erro inesperado na criação:", eCreate?.message) } catch {} }
      }

      return null
    } catch {
      return null
    }
  },

  async getCertificadoInfo() {
    const candidates = []
    const envInfo = (import.meta.env.VITE_MEDICO_CERTIFICADO_INFO_ENDPOINT || "").trim()
    if (envInfo) candidates.push(envInfo)

    const medBaseRaw = import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/"
    const medBase = medBaseRaw.endsWith("/") ? medBaseRaw : `${medBaseRaw}/`

    // Rotas comuns
    candidates.push(`${medBase}me/certificado/`)
    candidates.push(`${medBase}certificado/`) // pode inferir médico pelo token
    candidates.push(`/medico/certificado/`)
    candidates.push(`/assinatura/certificado/`)
    candidates.push(`/certificados/`)
    // Fallbacks com /api
    candidates.push(`/api/medicos/me/certificado/`)
    candidates.push(`/api/medicos/certificado/`)
    candidates.push(`/api/certificados/`)

    // Rotas com ID
    let medicoId = null
    try {
      medicoId = await this._resolveMedicoId()
    } catch {}
    if (medicoId) {
      candidates.push(`${medBase}${medicoId}/certificado/`)
      candidates.push(`${medBase}${medicoId}/assinatura/`)
      candidates.push(`/api/medicos/${medicoId}/certificado/`)
      candidates.push(`/api/medicos/${medicoId}/assinatura/`)
    }

    let lastErr = null
    for (const raw of candidates) {
      if (!raw) continue
      const url = raw.endsWith("/") ? raw : `${raw}/`
      try {
        // console.debug("[medicoService] GET", url)
        const { data } = await api.get(url)
        const val = Array.isArray(data?.results) ? data.results?.[0] : Array.isArray(data) ? data[0] : data
        if (val) return val
        return data || null
      } catch (e) {
        const st = e?.response?.status
        if (st === 404) {
          lastErr = e
          continue
        }
        if (st === 401) throw e // sessão inválida
        lastErr = e
      }
    }
    if (lastErr) throw lastErr
    return null
  },

  async uploadCertificado(input) {
    // input pode ser FormData ou File/Blob
    let formData
    if (input instanceof FormData) {
      formData = input
    } else if (input && input.name) {
      formData = new FormData()
      formData.append("file", input)
      formData.append("certificado", input)
      formData.append("pfx", input)
    } else {
      throw new Error("Parâmetro inválido: é esperado FormData ou File.")
    }

    const candidates = []
    const envUpload = (import.meta.env.VITE_MEDICO_CERTIFICADO_ENDPOINT || "").trim()
    if (envUpload) candidates.push(envUpload)

    const medBaseRaw = import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/"
    const medBase = medBaseRaw.endsWith("/") ? medBaseRaw : `${medBaseRaw}/`

    // Rotas comuns
    candidates.push(`${medBase}me/certificado/`)
    candidates.push(`${medBase}certificado/`) // pode inferir médico pelo token
    candidates.push(`/medico/certificado/`)
    candidates.push(`/assinatura/certificado/`)
    candidates.push(`/certificados/`)

    // Rotas com ID
    let medicoId = null
    try {
      medicoId = await this._resolveMedicoId()
    } catch {}
    if (medicoId) {
      candidates.push(`${medBase}${medicoId}/certificado/`)
      candidates.push(`${medBase}${medicoId}/assinatura/`)
    }

    let lastErr = null
    for (const raw of candidates) {
      if (!raw) continue
      const url = raw.endsWith("/") ? raw : `${raw}/`
      // Tenta POST, depois PUT, depois PATCH
      const methods = ["post", "put", "patch"]
      for (const m of methods) {
        try {
          // console.debug(`[medicoService] ${m.toUpperCase()} ${url}`)
          const { data } = await api[m](url, formData)
          return data
        } catch (e) {
          const st = e?.response?.status
          if (st === 404) {
            lastErr = e
            break // tenta próximo endpoint
          }
          if (st === 405) {
            lastErr = e
            continue // tenta próximo método no mesmo endpoint
          }
          if (st === 401) throw e // sessão inválida
          // Para 400/422 (validação), propaga diretamente para o UI mostrar
          if (st && [400, 422].includes(st)) throw e
          lastErr = e
          break
        }
      }
    }
    if (lastErr) throw lastErr
    throw new Error("Falha ao enviar certificado: nenhum endpoint compatível.")
  },

  // NOVO: enviar receita (permite anexar arquivo assinado e/ou referenciar uma receita existente)
  async enviarReceita({ receitaId, pacienteId, email, formato = "pdf", file, filename }) {
    if (!email && !pacienteId && !receitaId && !file) {
      throw new Error("Forneça ao menos email, pacienteId, receitaId ou arquivo para envio.")
    }

    const VERBOSE = String(import.meta.env.VITE_VERBOSE_ENDPOINT_LOGS || "").toLowerCase() === "true"

    const baseReceitas = (import.meta.env.VITE_RECEITAS_ENDPOINT || "/receitas/").replace(/\/?$/, "/")
    const basePacientes = (import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/").replace(/\/?$/, "/")

    // Se não veio receitaId, tentar descobrir a última receita do paciente
    if (!receitaId && pacienteId) {
      const tryFindId = async (params) => {
        try {
          const res = await api.get(baseReceitas, { params })
          const data = res?.data
          const list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
          const first = list?.[0]
          const found = first?.id || first?.pk || first?.uuid || first?.receita?.id
          if (found) return String(found)
        } catch (_) {}
        return null
      }
      const paramVariants = []
      const ords = ["-created_at", "-created", "-data", "-date", "-id", "-pk"]
      for (const o of ords) {
        paramVariants.push({ paciente: pacienteId, ordering: o, page_size: 1, limit: 1 })
        paramVariants.push({ paciente_id: pacienteId, ordering: o, page_size: 1, limit: 1 })
      }
      for (const p of paramVariants) {
        // eslint-disable-next-line no-await-in-loop
        const fid = await tryFindId(p)
        if (fid) { receitaId = fid; break }
      }
      if (VERBOSE && receitaId) {
        // eslint-disable-next-line no-console
        console.debug("[medicoService.enviarReceita] receitaId inferido via listagem:", receitaId)
      }
    }

    // Monta FormData (preferimos multipart para suportar arquivo quando presente)
    const formData = new FormData()
    if (file) {
      const fname = filename || (file.name || `receita.${formato || "pdf"}`)
      formData.append("file", file, fname)
      formData.append("pdf", file, fname)
      formData.append("documento", file, fname)
    }
    if (email) {
      formData.append("email", email)
      formData.append("to", email)
      formData.append("destinatario", email)
      formData.append("paciente_email", email)
    }
    if (formato) formData.append("formato", formato)
    if (receitaId) {
      formData.append("id", receitaId)
      formData.append("receita", receitaId)
      formData.append("receita_id", receitaId)
    }
    if (pacienteId) {
      formData.append("paciente", pacienteId)
      formData.append("paciente_id", pacienteId)
    }
    // Sugere ao backend assinar caso ele faça isso server-side
    formData.append("assinar", "true")

    // Também preparar payload JSON como fallback
    const jsonPayload = {
      email,
      to: email,
      destinatario: email,
      paciente_email: email,
      formato,
      id: receitaId,
      receita: receitaId,
      receita_id: receitaId,
      paciente: pacienteId,
      paciente_id: pacienteId,
      assinar: true,
    }

    // Candidatos de endpoints
    const candidates = []
    const envSend = (import.meta.env.VITE_ENVIAR_RECEITA_ENDPOINT || "").trim()
    if (envSend) candidates.push(envSend)

    if (receitaId) {
      candidates.push(`${baseReceitas}${receitaId}/enviar/`)
      candidates.push(`${baseReceitas}${receitaId}/enviar-email/`)
      candidates.push(`${baseReceitas}${receitaId}/enviar_email/`)
      candidates.push(`${baseReceitas}${receitaId}/email/`)
      candidates.push(`${baseReceitas}${receitaId}/send-email/`)
      candidates.push(`${baseReceitas}${receitaId}/send/`)
    }
    candidates.push(`${baseReceitas}enviar/`)
    candidates.push(`${baseReceitas}enviar-email/`)
    candidates.push(`${baseReceitas}enviar_email/`)
    candidates.push(`${baseReceitas}email/`)
    candidates.push(`${baseReceitas}send-email/`)
    candidates.push(`${baseReceitas}send/`)
    candidates.push(`/email/receitas/`)
    candidates.push(`/receitas/email/`)
    candidates.push(`/email/send/`)
    candidates.push(`/send-email/`)

    if (pacienteId) {
      candidates.push(`${basePacientes}${pacienteId}/receitas/enviar/`)
      candidates.push(`${basePacientes}${pacienteId}/receitas/email/`)
      candidates.push(`${basePacientes}${pacienteId}/receitas/send/`)
      if (receitaId) {
        candidates.push(`${basePacientes}${pacienteId}/receitas/${receitaId}/enviar/`)
        candidates.push(`${basePacientes}${pacienteId}/receitas/${receitaId}/enviar-email/`)
        candidates.push(`${basePacientes}${pacienteId}/receitas/${receitaId}/enviar_email/`)
        candidates.push(`${basePacientes}${pacienteId}/receitas/${receitaId}/email/`)
        candidates.push(`${basePacientes}${pacienteId}/receitas/${receitaId}/send-email/`)
        candidates.push(`${basePacientes}${pacienteId}/receitas/${receitaId}/send/`)
      }
    }

    let lastErr = null
    for (const raw of candidates) {
      if (!raw) continue
      const url = raw.endsWith("/") ? raw : `${raw}/`

      const logTry = (method) => {
        if (VERBOSE) {
          // eslint-disable-next-line no-console
          console.debug(`[medicoService.enviarReceita] ${method} ->`, url, { receitaId, pacienteId, email, formato })
        }
      }

      // Alguns backends expõem ação de envio via GET em rotas de ação
      const looksLikeAction = /\/(enviar|email|send(-email)?)\/?$/i.test(url)
      if (looksLikeAction) {
        try {
          logTry("GET")
          const params = {
            email,
            formato,
            id: receitaId,
            receita: receitaId,
            receita_id: receitaId,
            paciente: pacienteId,
            paciente_id: pacienteId,
            assinar: true,
          }
          const { data } = await api.get(url, { params })
          return data
        } catch (eGETfirst) {
          lastErr = eGETfirst
          const st = eGETfirst?.response?.status
          if (st === 401) throw eGETfirst
          // Continua para tentar POST/PUT abaixo
        }
      }

      // 1) Tenta POST multipart
      try {
        logTry("POST multipart")
        const { data } = await api.post(url, formData)
        return data
      } catch (e1) {
        const st1 = e1?.response?.status
        if (st1 === 401) throw e1
        if (st1 && [400, 422].includes(st1)) lastErr = e1 // guarda erro de validação
        else lastErr = e1
      }

      // 2) Tenta POST com JSON body
      try {
        logTry("POST json")
        const { data } = await api.post(url, jsonPayload)
        return data
      } catch (e2) {
        const st2 = e2?.response?.status
        if (st2 === 401) throw e2
        if (st2 && [400, 422].includes(st2)) lastErr = e2
        else lastErr = e2
      }

      // 3) Tenta PUT multipart
      try {
        logTry("PUT multipart")
        const { data } = await api.put(url, formData)
        return data
      } catch (e3) {
        const st3 = e3?.response?.status
        if (st3 === 401) throw e3
        if (st3 && [400, 422].includes(st3)) lastErr = e3
        else lastErr = e3
      }

      // 4) Tenta GET com query params (fallback geral)
      try {
        logTry("GET fallback")
        const params = {
          email,
          formato,
          id: receitaId,
          receita: receitaId,
          receita_id: receitaId,
          paciente: pacienteId,
          paciente_id: pacienteId,
          assinar: true,
        }
        const { data } = await api.get(url, { params })
        return data
      } catch (e4) {
        const st4 = e4?.response?.status
        if (st4 === 401) throw e4
        lastErr = e4
      }
    }

    if (lastErr) throw lastErr
    throw new Error("Falha ao enviar receita: nenhum endpoint compatível encontrado.")
  },

  // NOVO: assinar documento (PDF) com o certificado do médico
  async signDocumento(fileOrForm, meta = {}) {
    // fileOrForm pode ser File (PDF) ou FormData
    let formData
    if (fileOrForm instanceof FormData) {
      formData = fileOrForm
    } else if (fileOrForm && fileOrForm.name) {
      formData = new FormData()
      formData.append("file", fileOrForm)
      formData.append("documento", fileOrForm)
      formData.append("pdf", fileOrForm)
    } else {
      throw new Error("Parâmetro inválido: é esperado FormData ou File PDF.")
    }

    // Metadados opcionais (motivo, local, contact etc.)
    const reason = meta.reason || meta.motivo
    const location = meta.location || meta.local
    if (reason) formData.append("reason", reason), formData.append("motivo", reason)
    if (location) formData.append("location", location), formData.append("local", location)

    // NOVO: suporte a certificado efêmero (.pfx + senha) sem persistência
    if (meta && meta.pfxFile instanceof File) {
      formData.append("pfx", meta.pfxFile)
      formData.append("certificado", meta.pfxFile)
      formData.append("pkcs12", meta.pfxFile)
    }
    // Senha: enviar também quando vazia (certificado sem senha)
    if (meta && typeof meta.pfxPassword === "string") {
      const pw = meta.pfxPassword
      formData.append("pfx_password", pw)
      formData.append("senha", pw)
      formData.append("password", pw)
    }
    // Flags de orientação ao backend (backwards-compatible)
    formData.append("no_persist", "true")
    formData.append("ephemeral", "true")

    const candidates = []
    const envSign = (import.meta.env.VITE_MEDICO_ASSINATURA_ENDPOINT || "").trim()
    if (envSign) candidates.push(envSign)

    const medBaseRaw = import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/"
    const medBase = medBaseRaw.endsWith("/") ? medBaseRaw : `${medBaseRaw}/`

    // Rotas preferenciais e mais prováveis
    candidates.push(`/api/assinatura/assinar/`)
    candidates.push(`/assinatura/assinar/`)
    candidates.push(`/documentos/assinar/`)
    candidates.push(`/receitas/assinar/`)
    // Específicas do médico
    candidates.push(`${medBase}me/assinar/`)
    candidates.push(`${medBase}assinar/`)
    // Rotas com ID
    let medicoId = null
    try { medicoId = await this._resolveMedicoId() } catch {}
    if (medicoId) {
      candidates.push(`${medBase}${medicoId}/assinar/`)
      candidates.push(`${medBase}${medicoId}/assinatura/`)
    }

    let lastErr = null
    for (const raw of candidates) {
      if (!raw) continue
      const url = raw.endsWith("/") ? raw : `${raw}/`
      const methods = ["post", "put"]
      for (const m of methods) {
        try {
          const res = await api[m](url, formData, { responseType: "blob" })
          const contentDisposition = res.headers?.["content-disposition"] || res.headers?.get?.("content-disposition")
          let filename = "documento_assinado.pdf"
          if (contentDisposition) {
            const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(contentDisposition)
            filename = decodeURIComponent(match?.[1] || match?.[2] || filename)
          }
          const blob = new Blob([res.data], { type: res.headers?.["content-type"] || "application/pdf" })
          return { filename, blob }
        } catch (e) {
          const st = e?.response?.status
          if (st === 404) { lastErr = e; break }
          if (st === 405) { lastErr = e; continue }
          if (st === 401) throw e
          if (st && [400, 422].includes(st)) throw e
          lastErr = e; break
        }
      }
    }
    if (lastErr) throw lastErr
    throw new Error("Falha ao assinar documento: nenhum endpoint compatível.")
  },
  // ... existing code ...
  // NOVO: gerar documento de receita (PDF) com fallbacks de endpoints e métodos
  async gerarDocumentoReceita(payload = {}) {
    const VERBOSE = String(import.meta.env.VITE_VERBOSE_ENDPOINT_LOGS ?? "false").toLowerCase() === "true"
    const baseReceitas = (import.meta.env.VITE_RECEITAS_ENDPOINT || "/receitas/").replace(/\/?$/, "/")
  
    // Normalizar campos esperados pelo backend
    const p0 = { ...payload }
    const normalized = { ...p0 }
    // Campo "formato" padrão para PDF
    const fmt = String(p0.formato || p0.format || "pdf").toLowerCase()
    normalized.formato = fmt
    if (!normalized.medicamentos && p0.medicamento) normalized.medicamentos = p0.medicamento
    if (!normalized.medicamento && p0.medicamentos) normalized.medicamento = p0.medicamentos
    if (!normalized.validade && p0.validade_receita) normalized.validade = p0.validade_receita
    if (!normalized.paciente_id && p0.paciente) normalized.paciente_id = p0.paciente
    if (!normalized.paciente && p0.paciente_id) normalized.paciente = p0.paciente_id
    if (!normalized.consulta_id && p0.consulta) normalized.consulta_id = p0.consulta
    if (!normalized.consulta && p0.consulta_id) normalized.consulta = p0.consulta_id
  
    const candidates = []
    const envGen = (import.meta.env.VITE_GERAR_RECEITA_ENDPOINT || "").trim()
    if (envGen) candidates.push(envGen)
  
    // Rotas comuns
    candidates.push(`${baseReceitas}gerar-documento/`)
    candidates.push(`${baseReceitas}gerar/`)
    candidates.push(`${baseReceitas}pdf/`)
    candidates.push(`${baseReceitas}documento/`)
  
    // Variações singulares
    const singularBase = baseReceitas.replace(/receitas\/?$/i, "receita/")
    candidates.push(`${singularBase}gerar-documento/`)
    candidates.push(`${singularBase}gerar/`)
    candidates.push(`${singularBase}pdf/`)
  
    // Fallbacks com /api quando houver normalização diferente no backend
    candidates.push(`/api/receitas/gerar-documento/`)
    candidates.push(`/api/receitas/gerar/`)
    candidates.push(`/api/receitas/pdf/`)
  
    let lastErr = null
    for (const raw of candidates) {
      if (!raw) continue
      const url = raw.endsWith("/") ? raw : `${raw}/`
      // 1) Tentar POST JSON retornando blob
      try {
        if (VERBOSE) { try { console.debug("[gerarDocumentoReceita] POST", url, normalized) } catch {} }
        const res = await api.post(url, normalized, { responseType: "blob" })
        const contentDisposition = res.headers?.["content-disposition"] || res.headers?.get?.("content-disposition")
        let filename = "Receita.pdf"
        if (contentDisposition) {
          const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(contentDisposition)
          filename = decodeURIComponent(match?.[1] || match?.[2] || filename)
        }
        const blob = res?.data instanceof Blob ? res.data : new Blob([res.data], { type: res.headers?.["content-type"] || "application/pdf" })
        return { filename, blob }
      } catch (e1) {
        const st = e1?.response?.status
        if (VERBOSE) { try { console.warn("[gerarDocumentoReceita] POST falhou", url, st, e1?.response?.data || e1?.message) } catch {} }
        if (st === 401) throw e1
        // Em 405/404 tentar GET com query params
        if (![404, 405].includes(st)) lastErr = e1
      }
  
      // 2) GET com query params (alguns backends geram via GET)
      try {
        if (VERBOSE) { try { console.debug("[gerarDocumentoReceita] GET", url, normalized) } catch {} }
        const { data, headers } = await api.get(url, { params: normalized, responseType: "blob" })
        const contentDisposition = headers?.["content-disposition"] || headers?.get?.("content-disposition")
        let filename = "Receita.pdf"
        if (contentDisposition) {
          const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(contentDisposition)
          filename = decodeURIComponent(match?.[1] || match?.[2] || filename)
        }
        const blob = data instanceof Blob ? data : new Blob([data], { type: headers?.["content-type"] || "application/pdf" })
        return { filename, blob }
      } catch (e2) {
        const st2 = e2?.response?.status
        if (VERBOSE) { try { console.warn("[gerarDocumentoReceita] GET falhou", url, st2, e2?.response?.data || e2?.message) } catch {} }
        if (st2 === 401) throw e2
        lastErr = e2
      }
    }
  
    if (lastErr) throw lastErr
    throw new Error("Falha ao gerar documento da receita: nenhum endpoint compatível.")
  },
  async signDocumento(fileOrForm, meta = {}) {
    // fileOrForm pode ser File (PDF) ou FormData
    let formData
    if (fileOrForm instanceof FormData) {
      formData = fileOrForm
    } else if (fileOrForm && fileOrForm.name) {
      formData = new FormData()
      formData.append("file", fileOrForm)
      formData.append("documento", fileOrForm)
      formData.append("pdf", fileOrForm)
    } else {
      throw new Error("Parâmetro inválido: é esperado FormData ou File PDF.")
    }

    // Metadados opcionais (motivo, local, contact etc.)
    const reason = meta.reason || meta.motivo
    const location = meta.location || meta.local
    if (reason) formData.append("reason", reason), formData.append("motivo", reason)
    if (location) formData.append("location", location), formData.append("local", location)

    // NOVO: suporte a certificado efêmero (.pfx + senha) sem persistência
    if (meta && meta.pfxFile instanceof File) {
      formData.append("pfx", meta.pfxFile)
      formData.append("certificado", meta.pfxFile)
      formData.append("pkcs12", meta.pfxFile)
    }
    // Senha: enviar também quando vazia (certificado sem senha)
    if (meta && typeof meta.pfxPassword === "string") {
      const pw = meta.pfxPassword
      formData.append("pfx_password", pw)
      formData.append("senha", pw)
      formData.append("password", pw)
    }
    // Flags de orientação ao backend (backwards-compatible)
    formData.append("no_persist", "true")
    formData.append("ephemeral", "true")

    const candidates = []
    const envSign = (import.meta.env.VITE_MEDICO_ASSINATURA_ENDPOINT || "").trim()
    if (envSign) candidates.push(envSign)

    const medBaseRaw = import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/"
    const medBase = medBaseRaw.endsWith("/") ? medBaseRaw : `${medBaseRaw}/`

    // Rotas preferenciais e mais prováveis
    candidates.push(`/api/assinatura/assinar/`)
    candidates.push(`/assinatura/assinar/`)
    candidates.push(`/documentos/assinar/`)
    candidates.push(`/receitas/assinar/`)
    // Específicas do médico
    candidates.push(`${medBase}me/assinar/`)
    candidates.push(`${medBase}assinar/`)

    // Rotas com ID
    let medicoId = null
    try { medicoId = await this._resolveMedicoId() } catch {}
    if (medicoId) {
      candidates.push(`${medBase}${medicoId}/assinar/`)
      candidates.push(`${medBase}${medicoId}/assinatura/`)
    }

    let lastErr = null
    for (const raw of candidates) {
      if (!raw) continue
      const url = raw.endsWith("/") ? raw : `${raw}/`
      const methods = ["post", "put"]
      for (const m of methods) {
        try {
          const res = await api[m](url, formData, { responseType: "blob" })
          const contentDisposition = res.headers?.["content-disposition"] || res.headers?.get?.("content-disposition")
          let filename = "documento_assinado.pdf"
          if (contentDisposition) {
            const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(contentDisposition)
            filename = decodeURIComponent(match?.[1] || match?.[2] || filename)
          }
          const blob = new Blob([res.data], { type: res.headers?.["content-type"] || "application/pdf" })
          return { filename, blob }
        } catch (e) {
          const st = e?.response?.status
          if (st === 404) { lastErr = e; break }
          if (st === 405) { lastErr = e; continue }
          if (st === 401) throw e
          if (st && [400, 422].includes(st)) throw e
          lastErr = e; break
        }
      }
    }
    if (lastErr) throw lastErr
    throw new Error("Falha ao assinar documento: nenhum endpoint compatível.")
  },
}