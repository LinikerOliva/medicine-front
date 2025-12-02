import api from "./api"
import { authService } from "./authService"
import pdfTemplateService from "./pdfTemplateService"
import medicamentoService from "./medicamentoService"

export const medicoService = {
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
      } catch {};
    };
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
          // Antes retornava items[0] sem validar; agora valida correspondência com o usuário logado
          if (Array.isArray(items)) {
            const match = items.find(
              (m) => (
                m?.user?.id === localUser.id ||
                m?.usuario?.id === localUser.id ||
                m?.user === localUser.id ||
                m?.usuario === localUser.id
              )
            )
            if (match) return match
            // se não houver correspondência, continua tentando com a próxima chave
            continue
          };
          if (items && typeof items === "object") {
            const obj = items
            if (
              obj?.user?.id === localUser.id ||
              obj?.usuario?.id === localUser.id ||
              obj?.user === localUser.id ||
              obj?.usuario === localUser.id
            ) {
              return obj
            };
            // objeto sem correspondência; continua
            continue
          };
        } catch {};
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
        // Não retorne um médico aleatório: se não houver correspondência com o usuário logado, considere que NÃO é médico.
        return null
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

  async getMeusPacientes(medicoId = null) {
    // Resolve médico se não informado
    let mid = medicoId
    if (!mid) {
      try { mid = await this._resolveMedicoId() } catch {}
    }

    const results = []
    const pushUnique = (arr) => {
      const list = Array.isArray(arr) ? arr : (Array.isArray(arr?.results) ? arr.results : [])
      for (const p of list) {
        const key = p?.id || p?.user?.id || p?.cpf || p?.user?.cpf || JSON.stringify(p)
        if (!key) continue
        if (!results.some((x) => (x?.id || x?.user?.id) === (p?.id || p?.user?.id))) {
          results.push(p)
        }
      }
    }

    // 1) Endpoint dedicado: /medicos/{id}/pacientes/
    try {
      if (mid) {
        const medBaseRaw = import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/"
        const medBase = medBaseRaw.endsWith("/") ? medBaseRaw : `${medBaseRaw}/`
        const res = await api.get(`${medBase}${mid}/pacientes/`)
        pushUnique(res?.data)
      }
    } catch {}

    // 2) Filtro direto em /pacientes/ por médico vinculado
    try {
      const pacBaseRaw = import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/"
      const pacBase = pacBaseRaw.endsWith("/") ? pacBaseRaw : `${pacBaseRaw}/`
      const keys = ["medico", "medico_id", "responsavel", "doctor", "doctor_id"]
      for (const k of keys) {
        const res = await api.get(pacBase, { params: mid ? { [k]: mid, limit: 200 } : { limit: 200 } }).catch(() => null)
        if (res?.data) pushUnique(res.data)
      }
    } catch {}

    // 3) Fallback via consultas: coletar pacientes das consultas do médico
    try {
      const consBaseRaw = import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/"
      const consBase = consBaseRaw.endsWith("/") ? consBaseRaw : `${consBaseRaw}/`
      const params = mid ? { medico: mid, medico_id: mid, limit: 200 } : { limit: 200 }
      const res = await api.get(consBase, { params }).catch(() => null)
      const list = Array.isArray(res?.data?.results) ? res.data.results : (Array.isArray(res?.data) ? res.data : [])
      const pacs = list.map((c) => c?.paciente).filter(Boolean)
      pushUnique(pacs)
    } catch {}

    return results
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

  // NOVO: finalizar consulta com IA (sumarização no backend)
  async finalizarConsultaIA(consultaId, payload = {}) {
    if (!consultaId) throw new Error("consultaId é obrigatório")
    const base = "/consultas/"
    const candidates = [
      { method: "post", url: `${base}${consultaId}/finalizar-ia/`, data: payload },
      { method: "post", url: `/api/consultas/${consultaId}/finalizar-ia/`, data: payload },
      { method: "post", url: `${base}${consultaId}/finalizar_ia/`, data: payload },
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
    throw lastErr || new Error("Endpoint finalizar-ia não disponível")
  },

  // NOVO: processamento unificado da transcrição no backend para criar Consulta, Receita e Itens
  async processarTranscricaoConsulta({ texto, consultaId, pacienteId, medicoId } = {}) {
    if (!texto) throw new Error("texto da transcrição é obrigatório")
    const base = (import.meta.env.VITE_CONSULTAS_PROCESSAR_ENDPOINT || "/consultas/processar_transcricao/").replace(/\/?$/, "/")
    const body = { texto, consulta_id: consultaId, consulta: consultaId, paciente: pacienteId, paciente_id: pacienteId, medico: medicoId, medico_id: medicoId }
    const candidates = [ base, "/api/consultas/processar_transcricao/", "/consultas/sumarizar_criar_receita/" ]
    let lastErr = null
    for (const url of candidates) {
      try { const { data } = await api.post(url, body); return data } catch (e) { const st=e?.response?.status; if (st===401) throw e; lastErr=e; continue }
    }
    if (lastErr) throw lastErr
    throw new Error("Endpoint de processamento de transcrição indisponível")
  },

  // NOVO: obter receita por ID e seus itens
  async getReceitaById(id) {
    if (!id) throw new Error("id da receita é obrigatório")
    const base = (import.meta.env.VITE_RECEITAS_ENDPOINT || "/receitas/").replace(/\/?$/, "/")
    const candidates = [ `${base}${id}/`, `/api/receitas/${id}/`, `/meu_app_receita/${id}/` ]
    let lastErr = null
    for (const url of candidates) {
      try { const { data } = await api.get(url); return data } catch (e) { const st=e?.response?.status; if (st===401) throw e; lastErr=e; continue }
    }
    if (lastErr) throw lastErr
    return null
  },

  async getReceitaItens(id) {
    if (!id) throw new Error("id da receita é obrigatório")
    const base = (import.meta.env.VITE_RECEITAS_ENDPOINT || "/receitas/").replace(/\/?$/, "/")
    const candidates = [ `${base}${id}/itens/`, `${base}${id}/items/`, `/api/receitas/${id}/itens/`, `/meu_app_receitaitem/?receita=${id}` ]
    let lastErr = null
    for (const url of candidates) {
      try { const { data } = await api.get(url); const list = Array.isArray(data?.results)?data.results:(Array.isArray(data)?data:[]); return list } catch (e) { const st=e?.response?.status; if (st===401) throw e; lastErr=e; continue }
    }
    if (lastErr) throw lastErr
    return []
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
    // Permite desabilitar completamente a criação de receita para evitar 404 em backends sem esse recurso
    const CREATE_DISABLED = String(import.meta.env.VITE_RECEITAS_CREATE_DISABLED || "").toLowerCase() === "true"
    if (CREATE_DISABLED) {
      try { console.debug("[medicoService.criarReceita] criação desabilitada por VITE_RECEITAS_CREATE_DISABLED=true") } catch {}
      return { ok: false, disabled: true }
    }

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
    // Compat: nomes explícitos exigidos por alguns serializers
    if (p0.nome_paciente && !normalized.paciente_nome) normalized.paciente_nome = p0.nome_paciente
    if (p0.medico && !normalized.medico_nome) normalized.medico_nome = p0.medico
    if (p0.crm && !normalized.medico_crm) normalized.medico_crm = p0.crm
    // Defaults: marcar como ativa e definir validade para +30 dias quando ausentes
    const today = new Date()
    if (!normalized.data_prescricao && !normalized.data_emissao) {
      normalized.data_prescricao = today.toISOString()
    }
    const addDays = (base, days) => {
      const d = new Date(base); d.setDate(d.getDate() + days)
      const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${dd}`
    }
    if (!normalized.validade && !normalized.validade_receita) {
      normalized.validade = addDays(today, 30)
    }
    if (!normalized.status) {
      normalized.status = 'PENDENTE'
    }

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
    // Removido: endpoints de geração/preview/pdf NÃO devem ser usados para criar registros

    // Variações singulares e nomes alternativos comuns em backends
    const singularBase = baseReceitas.replace(/receitas\/?$/i, "receita/")
    const altBases = Array.from(new Set([
      singularBase,
      "/receita/",
      "/meu_app_receita/",
      "/meu_app_receitas/",
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
          // Fallback: em caso de validação 400/422, tentar um payload minimal; se falhar, CONTINUAR para outros endpoints
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
                const res = await api[m](url, minimal)
                const data = res?.data
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
                // Não abortar: seguir tentando próximos candidatos
                lastErr = e2
                continue
              }
            }
            // Se já tentou minimal neste endpoint, ainda assim enriquecer a mensagem antes de propagar
            try {
              const body = e?.response?.data
              const detail = (typeof body === "string" && body) || body?.detail || body?.message || e?.message || "Erro desconhecido"
              const bodyStr = body && typeof body === "object" ? ` | body=${JSON.stringify(body)}` : (typeof body === "string" ? ` | body=${body}` : "")
              e.message = `Falha ao criar receita (última tentativa: ${lastTried || ""}) ⇒ [${st || ""}] ${detail}${bodyStr}`
            } catch {}
            // Continuar para próximos candidatos
            continue
          }
          if (st === 404) { lastErr = e; break }
          if (st === 405) { lastErr = e; continue }
          if (st === 401) throw e
          if (st && [400, 422].includes(st)) { lastErr = e; continue }
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

  // NOVO: salvar itens da receita (meu_app_receitaitem)
  async salvarItensReceita(receitaId, itens = []) {
    if (!receitaId) throw new Error("receitaId é obrigatório para salvar itens.")
    if (!Array.isArray(itens) || itens.length === 0) return { count: 0, results: [] }

    const VERBOSE = String(import.meta.env.VITE_VERBOSE_ENDPOINT_LOGS || "").toLowerCase() === "true"
    const baseReceitas = (import.meta.env.VITE_RECEITAS_ENDPOINT || "/receitas/").replace(/\/?$/, "/")
    const envItems = (import.meta.env.VITE_RECEITA_ITENS_ENDPOINT || "").trim()

    // Normaliza itens
    const normalizedItems = itens.map((item) => {
      const mId = item.medicamento_id || item.medicamento?.id || item.medicamento
      const obj = {
        receita: receitaId,
        receita_id: receitaId,
        medicamento_id: mId,
        medicamento: mId,
        // Texto/descrição do medicamento
        nome: item.nome || item.medicamento_nome || item.descricao || item.texto || item.medicamento || item.medicamentos,
        medicamento_nome: item.medicamento_nome || item.nome || item.descricao || item.texto,
        descricao: item.descricao || item.texto || item.nome || item.medicamento,
        // Posologia/instruções
        posologia: item.posologia || item.instrucoes || item.indicacoes,
        dose: item.dose || item.dosagem,
        frequencia: item.frequencia || item.freq || item.intervalo,
        duracao: item.duracao || item.dias || item.periodo,
        observacoes: item.observacoes || item.obs || item.nota,
      }
      return obj
    })

    // Resolver medicamento_id quando vier apenas nome/descrição (compat com serializer do backend)
    for (let i = 0; i < normalizedItems.length; i++) {
      const item = normalizedItems[i]
      if (!item.medicamento_id) {
        const nomeRaw = item.nome || item.medicamento_nome || item.descricao
        const nome = (nomeRaw || "").toString().trim()
        if (!nome) continue
        let medId = null
        // 1) Buscar por nome
        try {
          const list = await medicamentoService.search(nome).catch(() => [])
          const arr = Array.isArray(list) ? list : (Array.isArray(list?.results) ? list.results : [])
          const match = arr.find((m) => String(m?.nome || "").toLowerCase() === nome.toLowerCase()) || arr[0]
          if (match && match.id) medId = match.id
        } catch (_) {}
        // 2) Criar se não encontrado
        if (!medId) {
          try {
            const created = await medicamentoService.create({ nome, ativo: true })
            medId = created?.id || null
          } catch (_) {}
        }
        if (medId) {
          item.medicamento_id = medId
          item.medicamento = medId
        }
      }
    }

    // Candidatos de endpoint (bulk primeiro)
    const candidates = []
    if (envItems) candidates.push(envItems)
    candidates.push(`${baseReceitas}${receitaId}/itens/`)
    candidates.push(`${baseReceitas}${receitaId}/items/`)
    candidates.push(`${baseReceitas}${receitaId}/receitaitens/`)
    candidates.push(`/api/receitaitem/`)
    candidates.push(`/receitaitem/`)
    candidates.push(`/api/receitas/itens/`)
    candidates.push(`/receitas/itens/`)
    candidates.push(`/meu_app_receitaitem/`)

    let lastErr = null
    // 1) Tenta enviar em lote
    for (const raw of candidates) {
      if (!raw) continue
      const url = raw.endsWith("/") ? raw : `${raw}/`
      try {
        if (VERBOSE) { try { console.debug("[salvarItensReceita] POST bulk ->", url) } catch {} }
        const payloadBulk = { itens: normalizedItems, receita: receitaId, receita_id: receitaId }
        const { data } = await api.post(url, payloadBulk)
        return data || { count: normalizedItems.length, results: normalizedItems }
      } catch (e) {
        const st = e?.response?.status
        if (st === 401) throw e
        // Se 404/405/400, vamos tentar item a item em endpoints de item
        lastErr = e
        continue
      }
    }

    // 2) Fallback: enviar item por item
    const singleCandidates = [
      envItems ? envItems.replace(/\/?$/, "/") : null,
      "/api/receitaitem/",
      "/receitaitem/",
      "/api/receitas/itens/",
      "/receitas/itens/",
      "/meu_app_receitaitem/",
    ].filter(Boolean)

    const results = []
    for (const item of normalizedItems) {
      let saved = null
      let lastErrSingle = null
      for (const raw of singleCandidates) {
        const url = raw.endsWith("/") ? raw : `${raw}/`
        try {
          if (VERBOSE) { try { console.debug("[salvarItensReceita] POST single ->", url, item) } catch {} }
          const { data } = await api.post(url, item)
          saved = data || item
          break
        } catch (e) {
          const st = e?.response?.status
          if (st === 401) throw e
          lastErrSingle = e
          continue
        }
      }
      if (!saved) {
        if (lastErrSingle) lastErr = lastErrSingle
        // mantém item original para não perder informação
        results.push(item)
      } else {
        results.push(saved)
      }
    }

    if (lastErr && results.length === 0) throw lastErr
    return { count: results.length, results }
  },

  // NOVO: anexar/armazenar arquivo assinado na receita
  async salvarArquivoAssinado(receitaId, blobOrFile, filename = "receita_assinada.pdf") {
    if (!receitaId) throw new Error("receitaId é obrigatório para salvar arquivo assinado.")
    if (!blobOrFile) throw new Error("Arquivo assinado (Blob/File) é obrigatório.")

    const VERBOSE = String(import.meta.env.VITE_VERBOSE_ENDPOINT_LOGS || "").toLowerCase() === "true"
    const baseReceitasRaw = import.meta.env.VITE_RECEITAS_ENDPOINT || "/receitas/"
    const baseReceitas = baseReceitasRaw.endsWith("/") ? baseReceitasRaw : `${baseReceitasRaw}/`
    const envUpload = (import.meta.env.VITE_RECEITA_UPLOAD_ARQUIVO_ENDPOINT || "").trim()

    const file = blobOrFile instanceof File ? blobOrFile : new File([blobOrFile], filename, { type: "application/pdf" })
    const fd = new FormData()
    fd.append("arquivo_assinado", file, filename)
    fd.append("pdf_assinado", file, filename)
    fd.append("documento_assinado", file, filename)
    fd.append("file", file, filename)
    fd.append("pdf", file, filename)
    fd.append("documento", file, filename)
    fd.append("receita", receitaId)
    fd.append("receita_id", receitaId)
    fd.append("id", receitaId)

    const candidates = []
    if (envUpload) candidates.push(envUpload)
    candidates.push(`${baseReceitas}${receitaId}/arquivo-assinado/`)
    candidates.push(`${baseReceitas}${receitaId}/arquivo/`)
    candidates.push(`${baseReceitas}${receitaId}/upload/`)
    candidates.push(`${baseReceitas}${receitaId}/anexos/`)
    // fallback: PATCH direto na receita
    candidates.push(`${baseReceitas}${receitaId}/`)
    candidates.push(`/api/receitas/${receitaId}/`)

    let lastErr = null
    for (const raw of candidates) {
      if (!raw) continue
      const url = raw.endsWith("/") ? raw : `${raw}/`
      const methods = ["post", "put", "patch"]
      for (const m of methods) {
        try {
          if (VERBOSE) { try { console.debug(`[salvarArquivoAssinado] ${m.toUpperCase()} ->`, url) } catch {} }
          const { data } = await api[m](url, fd)
          return data || { ok: true }
        } catch (e) {
          const st = e?.response?.status
          if (st === 401) throw e
          if (st === 404) { lastErr = e; break }
          if (st === 405) { lastErr = e; continue }
          if (st && [400,422].includes(st)) { lastErr = e; continue }
          lastErr = e
          break
        }
      }
    }
    if (lastErr) throw lastErr
    throw new Error("Falha ao salvar arquivo assinado: nenhum endpoint compatível.")
  },

  // NOVO: util para calcular SHA-256 do PDF assinado
  async computeSHA256Hex(blobOrFile) {
    const blob = blobOrFile instanceof Blob ? blobOrFile : new Blob([blobOrFile])
    const ab = await blob.arrayBuffer()
    const digest = await crypto.subtle.digest("SHA-256", ab)
    const bytes = new Uint8Array(digest)
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")
    return hex
  },

  // Geração de documento de receita 100% no cliente (sem backend/WeasyPrint)
  async gerarDocumentoReceitaLocal(payload = {}) {
    const p0 = { ...payload }
    const nomePaciente = p0.nome_paciente || p0.paciente_nome || ""
    const filename = p0.filename || `Receita_${nomePaciente || "Medica"}.pdf`
    try {
      const selector = p0.previewSelector || p0.elementSelector || "#receita-preview"
      const blob = await pdfTemplateService.generatePDFFromElement(selector, {
        pageSize: "a4",
        orientation: "portrait",
        scale: Number(p0.scale || 2)
      })
      return { filename, blob }
    } catch (_) {
      const receitaData = {
        medicamento: p0.medicamento || p0.medicamentos,
        medicamentos: p0.medicamentos || p0.medicamento,
        posologia: p0.posologia || p0.orientacoes,
        observacoes: p0.observacoes,
        validade_receita: p0.validade_receita || p0.validade,
        data_prescricao: p0.data_prescricao || p0.data_emissao || new Date().toISOString(),
        itens: p0.itens || []
      }
      const medicoData = {
        nome: p0.medico_nome || p0.medico,
        crm: p0.medico_crm || p0.crm,
        especialidade: p0.especialidade || "",
        endereco_consultorio: p0.endereco_consultorio || "",
        telefone_consultorio: p0.telefone_consultorio || "",
        email: p0.email_medico || ""
      }
      const pacienteData = {
        nome: nomePaciente || p0.paciente,
        idade: p0.idade,
        cpf: p0.cpf,
        data_nascimento: p0.data_nascimento,
        endereco: p0.endereco_paciente || "",
        telefone: p0.telefone_paciente || ""
      }
      const medicoId = p0.medico_id || p0.medico || await this._resolveMedicoId().catch(() => "default")
      const blob = await pdfTemplateService.generatePDF(receitaData, medicoData, pacienteData, medicoId)
      return { filename, blob }
    }
  },

  // NOVO: gerar documento de receita (PDF/DOCX) com múltiplos fallbacks de endpoint
  async gerarDocumentoReceita(payload = {}) {
    const VERBOSE = String(import.meta.env.VITE_VERBOSE_ENDPOINT_LOGS || "").toLowerCase() === "true"
    const baseReceitas = (import.meta.env.VITE_RECEITAS_ENDPOINT || "/receitas/").replace(/\/?$/, "/")
    const baseConsultas = (import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/").replace(/\/?$/, "/")
    const medBaseRaw = import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/"
    const medBase = medBaseRaw.endsWith("/") ? medBaseRaw : `${medBaseRaw}/`

    // Normaliza campos aceitando sinônimos
    const p0 = { ...payload }
    const pacienteId = p0.paciente_id || p0.paciente
    const consultaId = p0.consulta_id || p0.consulta
    const formato = (p0.formato || "pdf").toLowerCase()
    const normalized = { ...p0 }
    if (!normalized.paciente_id && pacienteId) normalized.paciente_id = pacienteId
    if (!normalized.paciente && pacienteId) normalized.paciente = pacienteId
    if (!normalized.consulta_id && consultaId) normalized.consulta_id = consultaId
    if (!normalized.consulta && consultaId) normalized.consulta = consultaId
    if (!normalized.medicamentos && p0.medicamento) normalized.medicamentos = p0.medicamento
    if (!normalized.medicamento && p0.medicamentos) normalized.medicamento = p0.medicamentos
    if (!normalized.validade && p0.validade_receita) normalized.validade = p0.validade_receita
    
    // Normalizar nomes de campos para compatibilidade com backend
    if (p0.nome_paciente && !normalized.paciente_nome) normalized.paciente_nome = p0.nome_paciente
    if (p0.medico && !normalized.medico_nome) normalized.medico_nome = p0.medico
    if (p0.crm && !normalized.medico_crm) normalized.medico_crm = p0.crm
    
    normalized.formato = formato

    // Resolve automaticamente o ID do médico quando ausente
    try {
      const midResolved = normalized.medico_id || normalized.medico || await this._resolveMedicoId().catch(() => null)
      if (midResolved) {
        if (!normalized.medico_id) normalized.medico_id = midResolved
        if (!normalized.medico) normalized.medico = midResolved
      }
    } catch {}

    const candidates = []
    const envGen = (import.meta.env.VITE_GERAR_RECEITA_ENDPOINT || "").trim()
    if (envGen) candidates.push(envGen)

    // Priorizar endpoints que sabemos que existem no backend
    candidates.push(`${baseReceitas}pdf/`)           // /api/receitas/pdf/
    candidates.push(`${baseReceitas}gerar/`)         // /api/receitas/gerar/
    candidates.push(`${baseReceitas}documento/`)     // /api/receitas/documento/
    candidates.push(`/api/gerar-receita/`)           // endpoint direto
    
    // Endpoints comuns (fallback)
    const pushCommon = (b) => {
      const bb = b.replace(/\/?$/, "/")
      candidates.push(`${bb}generate/`)
      candidates.push(`${bb}preview/`)
    }
    pushCommon(baseReceitas)
    
    // singular e alternativos (apenas se necessário)
    const singularBase = baseReceitas.replace(/receitas\/?$/i, "receita/")
    if (singularBase !== baseReceitas) {
      candidates.push(`${singularBase}pdf/`)
      candidates.push(`${singularBase}gerar/`)
    }

    // Remover tentativas desnecessárias que geram 404s
    // if (consultaId) candidates.push(`${baseConsultas}${consultaId}/gerar_receita/`)

    // Endpoints no contexto do médico (comentado para reduzir 404s)
    // try {
    //   const mid = await this._resolveMedicoId().catch(() => null)
    //   if (mid) {
    //     candidates.push(`${medBase}${mid}/gerar_receita/`)
    //     candidates.push(`${medBase}${mid}/receitas/gerar/`)
    //   }
    //   candidates.push(`${medBase}me/gerar_receita/`)
    // } catch {}

    if (VERBOSE) { try { console.debug("[medicoService.gerarDocumentoReceita] candidatos:", candidates) } catch {} }

    const buildResult = async (res) => {
      const ct = res.headers?.["content-type"] || res.headers?.get?.("content-type") || ""
      const cd = res.headers?.["content-disposition"] || res.headers?.get?.("content-disposition")
      let filename = `receita.${formato}`
      if (cd) {
        const m = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd)
        filename = decodeURIComponent(m?.[1] || m?.[2] || filename)
      }
      if (ct.includes("application/json")) {
        // Alguns backends retornam JSON com URL do arquivo
        try {
          const text = await new Response(res.data).text()
          const json = JSON.parse(text)
          const url = json.file || json.url || json.pdf || json.documento || json.download_url || json.link
          if (url) {
            const fileRes = await api.get(url, { responseType: "blob" })
            const blob = new Blob([fileRes.data], { type: fileRes.headers?.["content-type"] || (formato === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document") })
            return { filename: filename || (url.split("/").pop() || `receita.${formato}`), blob }
          }
        } catch {}
      }
      const blob = new Blob([res.data], { type: ct || (formato === "pdf" ? "application/pdf" : "application/octet-stream") })
      return { filename, blob }
    }

    let lastErr = null
    for (const raw of candidates) {
      if (!raw) continue
      const url = raw.endsWith("/") ? raw : `${raw}/`
      // 1) Tenta POST com JSON
      try {
        if (VERBOSE) { try { console.debug("[gerarDocumentoReceita] POST", url) } catch {} }
        const res = await api.post(url, normalized, { responseType: "blob" })
        return await buildResult(res)
      } catch (e1) {
        const st = e1?.response?.status
        if (st === 401) throw e1
        lastErr = e1
      }
      // 2) Tenta PUT
      try {
        if (VERBOSE) { try { console.debug("[gerarDocumentoReceita] PUT", url) } catch {} }
        const res = await api.put(url, normalized, { responseType: "blob" })
        return await buildResult(res)
      } catch (e2) {
        const st = e2?.response?.status
        if (st === 401) throw e2
        lastErr = e2
      }
      // 3) Tenta GET com query params
      try {
        if (VERBOSE) { try { console.debug("[gerarDocumentoReceita] GET", url) } catch {} }
        const res = await api.get(url, { params: normalized, responseType: "blob" })
        return await buildResult(res)
      } catch (e3) {
        const st = e3?.response?.status
        if (st === 401) throw e3
        lastErr = e3
      }
    }

    // Fallback local: gerar PDF no cliente quando nenhum endpoint for compatível
    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")
      const pdfDoc = await PDFDocument.create()
      const page = pdfDoc.addPage([595.28, 841.89]) // A4
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const draw = (text, x, y, size = 12, color = rgb(0, 0, 0)) => {
        page.drawText(String(text || ""), { x, y, size, font, color })
      }

      let y = 800
      draw("Receita Médica", 50, y, 16); y -= 30

      // Cabeçalho paciente
      draw(`Paciente: ${normalized.nome_paciente || normalized.paciente_nome || normalized.paciente_id || ""}` , 50, y); y -= 18
      draw(`Idade: ${normalized.idade || ""}` , 50, y); y -= 18
      draw(`RG/CPF: ${normalized.rg || normalized.cpf || ""}` , 50, y); y -= 18
      draw(`Nascimento: ${normalized.data_nascimento || ""}` , 50, y); y -= 24

      // Conteúdo principal
      draw("Medicamentos", 50, y, 14); y -= 18
      draw(String(normalized.medicamentos || normalized.medicamento || ""), 50, y); y -= 36

      draw("Posologia", 50, y, 14); y -= 18
      draw(String(normalized.posologia || ""), 50, y); y -= 36

      if (normalized.observacoes) {
        draw("Observações", 50, y, 14); y -= 18
        draw(String(normalized.observacoes), 50, y); y -= 36
      }

      // Rodapé médico
      draw(`Médico: ${normalized.medico || ""}` , 50, y); y -= 18
      draw(`CRM: ${normalized.crm || ""}` , 50, y); y -= 18
      draw(`Endereço: ${normalized.endereco_consultorio || ""}` , 50, y); y -= 18
      draw(`Telefone: ${normalized.telefone_consultorio || ""}` , 50, y); y -= 24

      const bytes = await pdfDoc.save()
      const blob = new Blob([bytes], { type: "application/pdf" })
      const filename = `receita.${formato}`
      return { filename, blob }
    } catch (e) {
      if (lastErr) throw lastErr
      throw new Error("Falha ao gerar documento de receita: nenhum endpoint compatível e fallback local indisponível.")
    }
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
          if (Array.isArray(items)) {
            const match = items.find(
              (m) => (
                m?.user?.id === uid ||
                m?.usuario?.id === uid ||
                m?.user === uid ||
                m?.usuario === uid
              )
            )
            if (match?.id) return match.id
            continue
          }
          if (items && typeof items === "object") {
            const obj = items
            if (
              (obj?.user?.id === uid || obj?.usuario?.id === uid || obj?.user === uid || obj?.usuario === uid) &&
              obj?.id
            ) {
              return obj.id
            }
            continue
          }
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
        // Não tente criar sem médico resolvido
        if (!mid) {
          if (VERBOSE) { try { console.warn("[_ensureConsultaId] médico não resolvido; abortando criação da consulta") } catch {} }
          return null
        }
        const body = {
          medico: mid,
          medico_id: mid,
          paciente: pacienteId,
          paciente_id: pacienteId,
          data_hora: `${day}T00:00:00`,
          tipo: "rotina",
          motivo: "Emissão de receita automática",
        }

        // Evita endpoints alternativos que retornam 405
        const endpoints = [
          baseConsultas,
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
      // IMPORTANTE: se houver arquivo assinado, evitamos GET para não perder o PDF assinado
      if (looksLikeAction && !file) {
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

      // 2) Tenta POST com JSON body (somente se não houver arquivo assinado)
      if (!file) {
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

      // 4) Tenta GET com query params (fallback geral) — somente quando não houver arquivo assinado
      if (!file) {
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
    }

    if (lastErr) throw lastErr
    throw new Error("Falha ao enviar receita: nenhum endpoint compatível encontrado.")
  },

  // NOVO: Provisionamento automático de Médico e Perfil
  async ensureMedicoRecord(medicoData = {}) {
    const user = authService.getCurrentUser() || (await authService.refreshCurrentUser())
    const uid = user?.id
    if (!uid) throw new Error("Usuário não autenticado ou não disponível.")

    // 1) Se já houver médico vinculado, retorna
    try {
      const mid = await this._resolveMedicoId()
      if (mid) {
        const medBaseRaw = import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/"
        const medBase = medBaseRaw.endsWith("/") ? medBaseRaw : `${medBaseRaw}/`
        try {
          const res = await api.get(`${medBase}${mid}/`)
          return res.data || { id: mid }
        } catch {
          return { id: mid }
        }
      }
    } catch {}

    // 2) Tentar criar registro do médico com status pendente
    const medBaseRaw = import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/"
    const medBase = medBaseRaw.endsWith("/") ? medBaseRaw : `${medBaseRaw}/`

    const payload = { ...medicoData }
    // Vinculação ao usuário (múltiplas chaves compatíveis)
    payload.user = payload.user || uid
    payload.user_id = payload.user_id || uid
    payload.usuario = payload.usuario || uid
    payload.usuario_id = payload.usuario_id || uid
    // Status inicial pendente
    const statusVal = String(payload.status || payload.situacao || payload.state || "pending").toLowerCase()
    payload.status = statusVal
    payload.situacao = payload.situacao || statusVal
    payload.state = payload.state || statusVal

    const candidates = [
      medBase,
      `${medBase}create/`,
      `/api/medicos/`,
      `/admin/medicos/`,
    ]

    let lastErrMed = null
    for (const raw of candidates) {
      const url = raw.endsWith("/") ? raw : `${raw}/`
      try {
        const { data } = await api.post(url, payload)
        // persistir id em localStorage para resoluções futuras
        const mid = data?.id || data?.pk || data?.uuid
        if (mid) {
          try { localStorage.setItem("medico_id", String(mid)) } catch {}
        }
        // marca status local
        try { if (uid) localStorage.setItem(`medicoApplicationStatus:${uid}`, "pending") } catch {}
        return data
      } catch (e1) {
        const st = e1?.response?.status
        if (st === 401) throw e1
        if (st === 405) { lastErrMed = e1; continue }
        lastErrMed = e1
        // Tentar multipart se houver arquivos nos dados fornecidos
        const hasFiles = Object.values(medicoData || {}).some((v) => v instanceof File || v instanceof Blob)
        if (hasFiles) {
          try {
            const fd = new FormData()
            for (const [k, v] of Object.entries(payload)) {
              if (v == null) continue
              fd.append(k, v)
              // sinônimos
              if (k === "user") fd.append("usuario", v), fd.append("user_id", v), fd.append("usuario_id", v)
              if (k === "status") fd.append("situacao", v), fd.append("state", v)
            }
            const { data } = await api.post(url, fd)
            const mid = data?.id || data?.pk || data?.uuid
            if (mid) {
              try { localStorage.setItem("medico_id", String(mid)) } catch {}
            }
            try { if (uid) localStorage.setItem(`medicoApplicationStatus:${uid}`, "pending") } catch {}
            return data
          } catch (e2) {
            lastErrMed = e2
            continue
          }
        }
      }
    }

    if (lastErrMed) throw lastErrMed
    throw new Error("Falha ao criar registro do médico: nenhum endpoint compatível.")
  },

  async ensurePerfilMedico(profileData = {}) {
    // Se já houver perfil, retorna
    try {
      const perfil = await this.getPerfil()
      if (perfil && (perfil.id || perfil.user || perfil.medico)) return perfil
    } catch {}

    const user = authService.getCurrentUser() || (await authService.refreshCurrentUser())
    const uid = user?.id
    if (!uid) throw new Error("Usuário não autenticado ou não disponível.")

    // Garante médicoId
    let medicoId = profileData.medico_id || profileData.medico || null
    if (!medicoId) {
      try { medicoId = await this._resolveMedicoId() } catch {}
      if (!medicoId) {
        try {
          const createdMed = await this.ensureMedicoRecord({})
          medicoId = createdMed?.id || createdMed?.medico?.id || null
        } catch {}
      }
    }

    const payload = { ...profileData }
    payload.user = payload.user || uid
    payload.user_id = payload.user_id || uid
    payload.usuario = payload.usuario || uid
    payload.usuario_id = payload.usuario_id || uid
    if (medicoId) {
      payload.medico = payload.medico || medicoId
      payload.medico_id = payload.medico_id || medicoId
    }
    const statusVal = String(payload.status || payload.situacao || payload.state || "pending").toLowerCase()
    payload.status = statusVal
    payload.situacao = payload.situacao || statusVal
    payload.state = payload.state || statusVal

    const candidates = [
      "/perfil-medico/",
      "/perfil/medico/",
      "/perfis/medico/",
      "/profiles/medico/",
      "/api/perfil-medico/",
      "/api/perfil/medico/",
    ]
    // rotas ligadas ao médico
    const medBaseRaw2 = import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/"
    const medBase2 = medBaseRaw2.endsWith("/") ? medBaseRaw2 : `${medBaseRaw2}/`
    if (medicoId) {
      candidates.push(`${medBase2}${medicoId}/perfil/`)
      candidates.push(`/api/medicos/${medicoId}/perfil/`)
    }
    candidates.push(`${medBase2}me/perfil/`)

    let lastErrPerfil = null
    for (const raw of candidates) {
      const url = raw.endsWith("/") ? raw : `${raw}/`
      const methods = ["post", "put", "patch"]
      for (const m of methods) {
        try {
          const { data } = await api[m](url, payload)
          try { if (uid) localStorage.setItem(`medicoApplicationStatus:${uid}`, "pending") } catch {}
          return data
        } catch (e) {
          const st = e?.response?.status
          if (st === 401) throw e
          if (st === 405) { lastErrPerfil = e; continue }
          if (st === 404) { lastErrPerfil = e; break }
          lastErrPerfil = e
          break
        }
      }
    }

    if (lastErrPerfil) throw lastErrPerfil
    throw new Error("Falha ao criar perfil do médico: nenhum endpoint compatível.")
  },

  async ensureMedicoAndPerfil(medicoData = {}, profileData = {}) {
    const user = authService.getCurrentUser() || (await authService.refreshCurrentUser())
    const uid = user?.id
    const medico = await this.ensureMedicoRecord(medicoData)
    const mid = medico?.id || medico?.medico?.id || null
    const perfil = await this.ensurePerfilMedico({ ...profileData, medico_id: profileData.medico_id || mid })
    try { if (uid) localStorage.setItem(`medicoApplicationStatus:${uid}`, "pending") } catch {}
    return { medico, perfil }
  },

  // NOVO: Atualização dos dados do médico (telefone, endereço, especialidade)
  async updatePerfilMedico(data = {}) {
    const payload = { ...data }

    // Telefone
    const telefone = data.telefone || data.celular || data.phone || data.contato?.telefone
    if (telefone != null) {
      payload.telefone = telefone
      if (!payload.celular) payload.celular = telefone
      if (!payload.phone) payload.phone = telefone
      payload.contato = { ...(payload.contato || {}), telefone }
    }

    // Endereço: aceitar string ou objeto
    let endereco = data.endereco || data.address || data.local
    if (endereco && typeof endereco === "object") {
      endereco = `${endereco.logradouro || endereco.rua || ""} ${endereco.numero || ""} ${endereco.bairro || ""} ${endereco.cidade || ""} ${endereco.estado || ""}`.trim()
    }
    if (endereco != null) {
      payload.endereco = endereco
      if (!payload.address) payload.address = endereco
      if (!payload.local) payload.local = endereco
    }

    // Especialidade: string, id ou objeto
    const esp = data.especialidade ?? data.especialidade_id ?? data.especialidade_nome ?? data.especialidade_label ?? data.especialidade_obj
    if (esp != null) {
      if (typeof esp === "number") {
        payload.especialidade_id = esp
      } else if (typeof esp === "string") {
        payload.especialidade = esp
        payload.especialidade_nome = esp
        payload.especialidade_label = esp
      } else if (typeof esp === "object") {
        const nome = esp.nome || esp.label || esp.titulo
        const id = esp.id
        if (id != null) payload.especialidade_id = id
        if (nome) {
          payload.especialidade = nome
          payload.especialidade_nome = nome
          payload.especialidade_label = nome
        }
      }
    }

    // Resolver ID do médico
    let medicoId = null
    try { medicoId = await this._resolveMedicoId() } catch {}

    const medBaseRaw = import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/"
    const medBase = medBaseRaw.endsWith("/") ? medBaseRaw : `${medBaseRaw}/`

    const candidates = []
    const envUpd = (import.meta.env.VITE_MEDICO_UPDATE_ENDPOINT || "").trim()
    if (envUpd) candidates.push(envUpd)

    // Rotas diretas do recurso médico
    candidates.push(`${medBase}me/`)
    if (medicoId) candidates.push(`${medBase}${medicoId}/`)

    // Rotas de perfil do médico
    if (medicoId) candidates.push(`${medBase}${medicoId}/perfil/`)
    candidates.push(`${medBase}me/perfil/`)
    candidates.push("/perfil-medico/")
    candidates.push("/perfil/medico/")
    candidates.push("/perfis/medico/")
    candidates.push("/profiles/medico/")
    candidates.push("/api/perfil-medico/")
    candidates.push("/api/perfil/medico/")

    let lastErr = null
    for (const raw of candidates) {
      if (!raw) continue
      const url = raw.endsWith("/") ? raw : `${raw}/`
      const methods = ["patch", "put", "post"]
      for (const m of methods) {
        try {
          const { data: res } = await api[m](url, payload)
          return res
        } catch (e) {
          const st = e?.response?.status
          if (st === 401) throw e
          if (st === 404) { lastErr = e; break }
          if (st === 405) { lastErr = e; continue }
          if (st && [400, 422].includes(st)) throw e
          lastErr = e
          break
        }
      }
    }
    if (lastErr) throw lastErr
    throw new Error("Falha ao atualizar dados do médico: nenhum endpoint compatível.")
  },

  // NOVO: Selo visual de assinatura e QR
  async _applySignatureStampToPdf(fileOrBlob, opts = {}) {
    try {
      const signerName = String(opts.signerName || "Médico(a)").trim()
      const dateStr = String(
        opts.dateString || (() => {
          const d = new Date()
          const pad = (n) => String(n).padStart(2, "0")
          return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
        })()
      )
      const receitaId = opts.receitaId || null
      const verifyUrl = opts.verifyUrl || this.buildVerifyUrl(receitaId)
      const certInfo = opts.certInfo || null

      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")
      const QRCode = await import("qrcode")

      const srcBlob = fileOrBlob instanceof Blob ? fileOrBlob : new Blob([await fileOrBlob.arrayBuffer?.()])
      const bytes = new Uint8Array(await srcBlob.arrayBuffer())
      const pdfDoc = await PDFDocument.load(bytes)
      const pages = pdfDoc.getPages()
      const page = pages[pages.length - 1]
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

      // Gera QR em dataURL e incorpora como PNG
      let qrPng
      try {
        const qrDataUrl = await QRCode.default.toDataURL(String(verifyUrl || ""), { 
          errorCorrectionLevel: "H", 
          margin: 1, 
          width: 256,
          color: { dark: '#000000', light: '#FFFFFF' }
        })
        const base64 = (qrDataUrl || "").split(",")[1] || ""
        const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
        qrPng = await pdfDoc.embedPng(raw)
      } catch (_) {}

      const { width, height } = page.getSize()
      
      // Área da assinatura (posicionada na elipse rabiscada - lado esquerdo inferior)
      const signatureArea = { x: 80, y: 80, w: 200, h: 80 }
      
      // Área do QR code (posicionada no quadrado - lado direito inferior)  
      const qrArea = { x: width - 150, y: 80, w: 80, h: 80 }
      
      // Fundo da área de assinatura
      page.drawRectangle({ 
        x: signatureArea.x, 
        y: signatureArea.y, 
        width: signatureArea.w, 
        height: signatureArea.h, 
        color: rgb(0.98, 0.98, 1),
        borderColor: rgb(0.2, 0.2, 0.8),
        borderWidth: 1
      })
      
      // Cabeçalho da assinatura
      page.drawText("ASSINATURA DIGITAL", { 
        x: signatureArea.x + 10, 
        y: signatureArea.y + signatureArea.h - 15, 
        size: 10, 
        font: boldFont, 
        color: rgb(0.2, 0.2, 0.8) 
      })
      
      // Nome do signatário (usar commonName do certificado se disponível)
      const displayName = certInfo?.subject?.commonName || signerName
      page.drawText(`${displayName}`, { 
        x: signatureArea.x + 10, 
        y: signatureArea.y + signatureArea.h - 30, 
        size: 9, 
        font, 
        color: rgb(0, 0, 0) 
      })
      
      // Informações do certificado se disponíveis
      let yOffset = signatureArea.h - 45
      if (certInfo?.subject) {
        if (certInfo.subject.organizationName) {
          page.drawText(`${certInfo.subject.organizationName}`, { 
            x: signatureArea.x + 10, 
            y: signatureArea.y + yOffset, 
            size: 7, 
            font, 
            color: rgb(0.3, 0.3, 0.3) 
          })
          yOffset -= 10
        }
        
        if (certInfo.subject.emailAddress) {
          page.drawText(`${certInfo.subject.emailAddress}`, { 
            x: signatureArea.x + 10, 
            y: signatureArea.y + yOffset, 
            size: 7, 
            font, 
            color: rgb(0.3, 0.3, 0.3) 
          })
          yOffset -= 10
        }
      }
      
      // Data da assinatura
      page.drawText(`${dateStr}`, { 
        x: signatureArea.x + 10, 
        y: signatureArea.y + yOffset, 
        size: 8, 
        font, 
        color: rgb(0, 0, 0) 
      })
      
      // Texto de verificação próximo ao QR code
      page.drawText("Escaneie para verificar", { 
        x: qrArea.x, 
        y: qrArea.y - 15, 
        size: 8, 
        font, 
        color: rgb(0.5, 0.5, 0.5) 
      })

      // QR Code posicionado no quadrado (lado direito)
      if (qrPng) {
        page.drawImage(qrPng, { 
          x: qrArea.x, 
          y: qrArea.y, 
          width: qrArea.w, 
          height: qrArea.h 
        })
      }

      const out = await pdfDoc.save()
      return new Blob([out], { type: "application/pdf" })
    } catch (err) {
      // Em caso de erro no selo, devolve o arquivo original
      try { console.warn("[medicoService] selo visual falhou:", err?.message || err) } catch {}
      const srcBlob = fileOrBlob instanceof Blob ? fileOrBlob : new Blob([await fileOrBlob.arrayBuffer?.()])
      return srcBlob
    }
  },

  buildVerifyUrl(receitaId) {
    try {
      const explicit = String(import.meta.env.VITE_RECEITA_VERIFY_URL || "").trim()
      if (explicit) {
        const base = explicit.replace(/\/?$/, "/")
        return receitaId ? `${base}${receitaId}` : base
      }
      const api = String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "")
      if (receitaId) return `${api}/receitas/${receitaId}/verificar/`
      return api || window?.location?.origin || ""
    } catch (_) {
      return ""
    }
  },

  async applySignatureStamp(blobOrFile, opts = {}) {
    return await this._applySignatureStampToPdf(blobOrFile, opts)
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
      formData.append("arquivo", fileOrForm)
    } else {
      throw new Error("Parâmetro inválido: é esperado FormData ou File PDF.")
    }

    // Carimbo visual e QR (antes da assinatura), se habilitado
    try {
      const enableStamp = meta?.visibleStamp !== false
      if (enableStamp) {
        let srcFile = (formData.get("file") || formData.get("pdf") || formData.get("documento"))
        if (!srcFile && fileOrForm && fileOrForm.name) srcFile = fileOrForm
        if (srcFile) {
          const rid = meta?.receitaId || meta?.id || meta?.receita || null
          let signerName = meta?.signerName
          if (!signerName) {
            const cert = await this.getCertificadoInfo().catch(() => null)
            signerName = cert?.subject_name || cert?.subject || cert?.nome || meta?.medicoNome || "Médico(a)"
          }
          const stampedBlob = await this._applySignatureStampToPdf(srcFile, {
            signerName,
            dateString: new Date().toLocaleString(),
            receitaId: rid,
          })
          const stampedFile = new File([stampedBlob], srcFile.name || "documento.pdf", { type: "application/pdf" })
          ;["file","pdf","documento","arquivo"].forEach((k) => {
            if (formData.has(k)) formData.set(k, stampedFile)
          })
        }
      }
    } catch (_) {}

    // Metadados opcionais (motivo, local, contact etc.)
    const reason = meta.reason || meta.motivo
    const location = meta.location || meta.local
    if (reason) formData.append("reason", reason), formData.append("motivo", reason)
    if (location) formData.append("location", location), formData.append("local", location)

    // Informar formato/tipo para compatibilidade
    try {
      formData.append("formato", "pdf")
      formData.append("format", "pdf")
      formData.append("tipo", "PADES")
      formData.append("assinar", "true")
    } catch {}

    // Determinar modo de assinatura: token físico vs PFX
    const flagFromForm = (k) => {
      const v = formData instanceof FormData ? formData.get(k) : null
      if (typeof v === "string") return v === "true" || v === "1" || v.toLowerCase() === "yes"
      return Boolean(v)
    }
    const useToken = Boolean(
      meta.useToken || meta.use_token || meta.token || meta.pkcs11 || meta.hardware || meta.smartcard ||
      flagFromForm("useToken") || flagFromForm("use_token") || flagFromForm("token") || flagFromForm("pkcs11") || flagFromForm("hardware") || flagFromForm("smartcard")
    )

    // Coleta dados do certificado arquivo (PFX) e senha
    let pfxFromForm = null
    let passFromForm = null
    if (formData instanceof FormData) {
      pfxFromForm = formData.get("pfx") || formData.get("certificado") || formData.get("pkcs12")
      passFromForm = formData.get("pfx_password") || formData.get("senha") || formData.get("password")
    }
    const pfx = (meta && meta.pfxFile instanceof File) ? meta.pfxFile : pfxFromForm
    const pw = (typeof meta?.pfxPassword === "string" ? meta.pfxPassword.trim() : "") || (typeof passFromForm === "string" ? passFromForm : "")

    // PIN opcional para token físico
    const pin = (meta.pin || meta.tokenPin || meta.pin_code || (formData instanceof FormData ? (formData.get("pin") || formData.get("token_pin") || formData.get("pin_code")) : "") || "").toString().trim()

    if (useToken) {
      // Assinatura via hardware/token: não exigir PFX
      formData.append("use_token", "true")
      formData.append("pkcs11", "true")
      formData.append("hardware", "true")
      if (pin) {
        formData.append("pin", pin)
        formData.append("token_pin", pin)
        formData.append("pin_code", pin)
      }
      // Seletores de certificado no token (opcionais)
      if (meta.subject) formData.append("subject", meta.subject)
      if (meta.serial) formData.append("serial", meta.serial)
      if (meta.slot) formData.append("slot", String(meta.slot))
      if (meta.keyId) formData.append("key_id", meta.keyId)
    } else {
      // Assinatura via PFX: exigir arquivo e senha
      if (!(pfx instanceof File)) {
        throw new Error("Certificado digital (.pfx/.p12) é obrigatório para assinatura.")
      }
      if (!pw) {
        throw new Error("Senha do certificado PFX/P12 é obrigatória para assinatura.")
      }
      formData.append("pfx", pfx)
      formData.append("pfx_file", pfx)
      formData.append("certificado", pfx)
      formData.append("pkcs12", pfx)
      // aliases adicionais para compatibilidade
      formData.append("arquivo_pfx", pfx)
      formData.append("pfx_password", pw)
      formData.append("senha", pw)
      formData.append("password", pw)
      // alias extra da senha conforme backend
      formData.append("senha_certificado", pw)
      formData.append("no_persist", "true")
      formData.append("ephemeral", "true")
    }

    // incluir receita_id quando disponível para vínculo de assinatura e QR
    const rid = meta?.receitaId || meta?.receita_id || meta?.id
    if (rid) {
      formData.append("receita", rid)
      formData.append("receita_id", rid)
      formData.append("id", rid)
      // alias adicional usado por alguns endpoints
      formData.append("id_receita", rid)
    }

    const VERBOSE = String(import.meta.env.VITE_VERBOSE_ENDPOINT_LOGS || "").toLowerCase() === "true"
    const candidates = []
    const envSign = (import.meta.env.VITE_MEDICO_ASSINATURA_ENDPOINT || "").trim()
    if (envSign) candidates.push(envSign)

    const medBaseRaw = import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/"
    const medBase = medBaseRaw.endsWith("/") ? medBaseRaw : `${medBaseRaw}/`

    candidates.push(`/api/assinatura/assinar/`)
    candidates.push(`/assinatura/assinar/`)
    // endpoints explícitos de receita
    candidates.push(`/api/assinar-receita/`)
    candidates.push(`/assinar-receita/`)
    candidates.push(`/documentos/assinar/`)
    candidates.push(`/receitas/assinar/`)
    candidates.push(`${medBase}me/assinar/`)
    candidates.push(`${medBase}assinar/`)

    let medicoId = null
    try { medicoId = await this._resolveMedicoId() } catch {}
    if (medicoId) {
      candidates.push(`${medBase}${medicoId}/assinar/`)
      candidates.push(`${medBase}${medicoId}/assinatura/`)
    }

    // Preparar JSON fallback (base64)
    const blobToBase64 = async (f) => {
      try {
        const ab = await f.arrayBuffer()
        const bytes = new Uint8Array(ab)
        let binary = ""
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
        return btoa(binary)
      } catch { return null }
    }
    const srcFileJson = formData.get("file") || formData.get("pdf") || formData.get("documento")
    const pfxJson = formData.get("pfx") || formData.get("certificado") || formData.get("pkcs12")
    const pdfBase64 = srcFileJson ? await blobToBase64(srcFileJson) : null
    const pfxBase64 = pfxJson ? await blobToBase64(pfxJson) : null

    const jsonPayload = {
      formato: "pdf",
      id: rid,
      receita: rid,
      receita_id: rid,
      file_base64: pdfBase64,
      pdf_base64: pdfBase64,
      documento_base64: pdfBase64,
      arquivo_base64: pdfBase64,
      pfx_base64: pfxBase64,
      certificado_base64: pfxBase64,
      pkcs12_base64: pfxBase64,
      password: pw,
      senha: pw,
      pfx_password: pw,
      reason,
      motivo: reason,
      location,
      local: location,
      use_token: useToken ? true : undefined,
      pkcs11: useToken ? true : undefined,
      hardware: useToken ? true : undefined,
      pin,
      token_pin: pin || undefined,
      pin_code: pin || undefined,
      tipo_assinatura: "pades",
      algoritmo: "sha256",
    }

    let lastErr = null
    for (const raw of candidates) {
      if (!raw) continue
      const url = raw.endsWith("/") ? raw : `${raw}/`
      const methods = ["post", "put"]
      for (const m of methods) {
        // 1) Tenta multipart
        try {
          if (VERBOSE) console.debug(`[signDocumento] ${m.toUpperCase()} multipart ->`, url)
          const res = await api[m](url, formData, { responseType: "blob" })
          const cd = res.headers?.["content-disposition"] || res.headers?.get?.("content-disposition")
          let filename = "documento_assinado.pdf"
          if (cd) {
            const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd)
            try { filename = decodeURIComponent(match?.[1] || match?.[2] || filename) } catch { filename = match?.[1] || match?.[2] || filename }
          }
          const blob = new Blob([res.data], { type: res.headers?.["content-type"] || "application/pdf" })
          return { filename, blob }
        } catch (e1) {
          const st1 = e1?.response?.status
          if (st1 === 404) { lastErr = e1; break }
          if (st1 === 405) { lastErr = e1; continue }
          if (st1 === 401) throw e1
          // 2) Fallback: JSON base64
          try {
            if (VERBOSE) console.debug(`[signDocumento] ${m.toUpperCase()} json ->`, url)
            const res = await api[m](url, jsonPayload, { responseType: "json" })
            const ct = res.headers?.["content-type"] || ""
            if (/application\/pdf/i.test(ct)) {
              const cd = res.headers?.["content-disposition"] || res.headers?.get?.("content-disposition")
              let filename = "documento_assinado.pdf"
              if (cd) {
                const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd)
                try { filename = decodeURIComponent(match?.[1] || match?.[2] || filename) } catch { filename = match?.[1] || match?.[2] || filename }
              }
              const blob = new Blob([res.data], { type: "application/pdf" })
              return { filename, blob }
            }
            // Se vier JSON com base64
            const payload = res.data || {}
            const b64 = payload?.pdf_base64 || payload?.documento_base64 || payload?.file_base64 || payload?.arquivo_base64 || null
            if (b64) {
              const byteChars = atob(String(b64))
              const byteNumbers = new Array(byteChars.length)
              for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i)
              const byteArray = new Uint8Array(byteNumbers)
              const blob = new Blob([byteArray], { type: "application/pdf" })
              const filename = payload?.filename || payload?.nome_arquivo || "documento_assinado.pdf"
              return { filename, blob }
            }
            // Se 400/422 no JSON, seguir tentando outros endpoints
            const st2 = res?.status
            if (st2 && [400,422].includes(st2)) { lastErr = e1; continue }
          } catch (e2) {
            const st2 = e2?.response?.status
            if (st2 === 404) { lastErr = e2; break }
            if (st2 === 405) { lastErr = e2; continue }
            if (st2 === 401) throw e2
            if (st2 && [400,422].includes(st2)) { lastErr = e2; continue }
            lastErr = e2; break
          }
        }
      }
    }

    if (lastErr) throw lastErr
    throw new Error("Falha ao assinar documento: nenhum endpoint compatível.")
  },

  // NOVO: atualizar receita (assinada, hashes e metadados)
  async atualizarReceita(id, payload = {}) {
    if (!id) throw new Error("ID da receita é obrigatório para atualização.")

    // Normaliza campos e sinônimos
    const body = { ...payload }
    if (payload.assinada !== undefined) {
      body.assinada = Boolean(payload.assinada)
      body.signed = body.signed ?? body.assinada
      body.status = body.assinada ? "ASSINADA" : (body.status || "PENDENTE")
    }
    // Hashes e algoritmo
    if (payload.hash_alg) {
      body.hash_alg = payload.hash_alg
      body.hash_algorithm = payload.hash_algorithm || payload.hash_alg
      body.algoritmo_hash = payload.algoritmo_hash || payload.hash_alg
    }
    if (payload.hash_pre) {
      body.hash_pre = payload.hash_pre
      body.pre_hash = payload.pre_hash || payload.hash_pre
    }
    if (payload.hash_documento) {
      body.hash_documento = payload.hash_documento
      body.signed_hash = payload.signed_hash || payload.hash_documento
    }
    // Outros metadados
    if (payload.motivo) body.motivo = payload.motivo
    if (payload.observacoes) body.observacoes = payload.observacoes

    const baseReceitasRaw = import.meta.env.VITE_RECEITAS_ENDPOINT || "/receitas/"
    const baseReceitas = baseReceitasRaw.endsWith("/") ? baseReceitasRaw : `${baseReceitasRaw}/`

    const candidates = []
    const envUpd = (import.meta.env.VITE_ATUALIZAR_RECEITA_ENDPOINT || "").trim()
    if (envUpd) candidates.push(envUpd.replace(/\/?$/, "/"))

    // Rotas diretas (somente PATCH para evitar 400 em PUT)
    candidates.push(`${baseReceitas}${id}/`)
    candidates.push(`/api/receitas/${id}/`)
    candidates.push(`/receitas/${id}/`)
    // Alternativo: modelo/tabela explicitamente nomeado
    candidates.push(`/api/meu_app_receita/${id}/`)
    candidates.push(`/meu_app_receita/${id}/`)

    let lastErr = null
    for (const raw of candidates) {
      if (!raw) continue
      const url = raw.endsWith("/") ? raw : `${raw}/`
      try {
        const { data } = await api.patch(url, body)
        return data
      } catch (e) {
        const st = e?.response?.status
        if (st === 401) throw e
        if (st === 404) { lastErr = e; continue }
        if (st === 405) { lastErr = e; continue }
        if (st && [400, 422].includes(st)) throw e
        lastErr = e
      }
    }
    if (lastErr) throw lastErr
    throw new Error("Falha ao atualizar receita: nenhum endpoint compatível.")
  },

  // NOVO: registrar auditoria de assinatura
  async registrarAuditoriaAssinatura(audit = {}) {
    const user = authService.getCurrentUser() || (await authService.refreshCurrentUser())
    const uid = user?.id
    let medicoId = null
    try { medicoId = await this._resolveMedicoId() } catch {}

    const body = { ...audit }
    // Normaliza chaves
    if (uid) {
      body.usuario = body.usuario || uid
      body.usuario_id = body.usuario_id || uid
      body.user = body.user || uid
      body.user_id = body.user_id || uid
    }
    if (medicoId) {
      body.medico = body.medico || medicoId
      body.medico_id = body.medico_id || medicoId
    }
    body.tipo = body.tipo || "assinatura_receita"
    body.event = body.event || body.tipo
    body.assinada = body.assinada ?? true
    body.timestamp = body.timestamp || new Date().toISOString()

    const baseAuditRaw = import.meta.env.VITE_AUDITORIA_ASSINATURA_ENDPOINT || "/auditoria/assinaturas/"
    const baseAudit = baseAuditRaw.endsWith("/") ? baseAuditRaw : `${baseAuditRaw}/`

    const candidates = [
      baseAudit,
      "/api/auditoria/assinaturas/",
      "/logs/assinatura/",
      "/auditoria/receitas/",
      "/audit/assinaturas/",
    ]

    let lastErr = null
    for (const raw of candidates) {
      const url = raw.endsWith("/") ? raw : `${raw}/`
      try {
        const { data } = await api.post(url, body)
        return data
      } catch (e) {
        const st = e?.response?.status
        if (st === 401) throw e
        if (st === 404 || st === 405) { lastErr = e; continue }
        if (st && [400, 422].includes(st)) throw e
        lastErr = e
      }
    }

    if (lastErr) throw lastErr
    throw new Error("Falha ao registrar auditoria de assinatura: nenhum endpoint compatível.")
  },

  // NOVO: Finalizar assinatura externa (A3/Token)
  async finalizarAssinaturaExterna({ receitaId, pdfFile, assinatura, certificado }) {
    const formData = new FormData()
    formData.append("file", pdfFile) // O PDF original
    formData.append("assinatura_externa", assinatura) // A assinatura (Base64)
    formData.append("certificado_externo", certificado) // O certificado (Base64)
    formData.append("receita_id", receitaId)
    
    // Este é o endpoint do Django que vai MONTAR o PDF
    const res = await api.post(`/api/assinatura/finalizar-externa/`, formData, {
      responseType: "blob"
    })
    
    // Lógica para extrair nome do arquivo e retornar o blob
    const cd = res.headers?.["content-disposition"] || ""
    let filename = "receita_assinada.pdf"
    if (cd) {
      const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd)
      try { 
        filename = decodeURIComponent(match?.[1] || match?.[2] || filename) 
      } catch {}
    }
    const blob = new Blob([res.data], { type: "application/pdf" })
    return { filename, blob }
  },

  // NOVO: salvar configuração de template de PDF do médico (backend + fallback)
  async salvarTemplateConfig(config = {}, logoData = null) {
    try {
      // Resolver ID do médico
      let medicoId = null
      try { medicoId = await this._resolveMedicoId() } catch {}

      // Preparar FormData quando houver logo
      const fd = new FormData()
      fd.append('config', JSON.stringify(config))
      if (medicoId) {
        fd.append('medico', medicoId)
        fd.append('medico_id', medicoId)
      }
      if (logoData) {
        if (typeof logoData === 'string' && logoData.startsWith('data:')) {
          // base64: enviar como texto e como arquivo sintético
          fd.append('logo_base64', logoData)
          try {
            const comma = logoData.indexOf(',')
            const mime = logoData.substring(5, logoData.indexOf(';')) || 'image/png'
            const b64 = comma >= 0 ? logoData.substring(comma + 1) : ''
            const binary = atob(b64)
            const bytes = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
            const blob = new Blob([bytes], { type: mime })
            const file = new File([blob], 'logo.png', { type: mime })
            fd.append('logo', file)
            fd.append('arquivo', file)
            fd.append('imagem', file)
          } catch {}
        } else if (logoData && logoData.name) {
          fd.append('logo', logoData)
          fd.append('arquivo', logoData)
          fd.append('imagem', logoData)
        }
      }

      const jsonPayload = {
        config,
        medico: medicoId || undefined,
        medico_id: medicoId || undefined,
        logo_base64: typeof logoData === 'string' ? logoData : undefined,
      }

      // Candidatos de endpoints
      const candidates = []
      const envEp = (import.meta.env.VITE_MEDICO_TEMPLATE_CONFIG_ENDPOINT || '').trim()
      if (envEp) candidates.push(envEp)
      const medBaseRaw = import.meta.env.VITE_MEDICOS_ENDPOINT || '/medicos/'
      const medBase = medBaseRaw.endsWith('/') ? medBaseRaw : `${medBaseRaw}/`
      if (medicoId) {
        candidates.push(`${medBase}${medicoId}/template/`)
        candidates.push(`${medBase}${medicoId}/pdf-template/`)
        candidates.push(`${medBase}${medicoId}/pdf_template/`)
      }
      candidates.push(`${medBase}me/template/`)
      candidates.push(`${medBase}me/pdf-template/`)
      candidates.push('/pdf-template-config/')
      candidates.push('/templates/pdf-config/')
      candidates.push('/templates/pdf/medico/')

      let lastErr = null
      for (const raw of candidates) {
        const url = raw.endsWith('/') ? raw : `${raw}/`
        // 1) POST multipart
        try {
          const res = await api.post(url, fd)
          if (res?.status && res.status >= 200 && res.status < 300) return true
        } catch (e1) {
          const st = e1?.response?.status
          if (st === 401) throw e1
          lastErr = e1
        }
        // 2) PATCH multipart
        try {
          const res = await api.patch(url, fd)
          if (res?.status && res.status >= 200 && res.status < 300) return true
        } catch (e2) {
          const st = e2?.response?.status
          if (st === 401) throw e2
          lastErr = e2
        }
        // 3) POST JSON
        try {
          const res = await api.post(url, jsonPayload)
          if (res?.status && res.status >= 200 && res.status < 300) return true
        } catch (e3) {
          const st = e3?.response?.status
          if (st === 401) throw e3
          lastErr = e3
        }
      }
      if (lastErr) return false
      return false
    } catch {
      return false
    }
  },

  // Wrapper para compatibilidade: assinarDocumento -> signDocumento
  async assinarDocumento(params = {}) {
    const { pdfFile, certificado, senha, motivo, receita_id, modo_assinatura, ...rest } = params
    
    // Criar FormData ou usar arquivo diretamente
    let fileOrForm = pdfFile
    if (certificado && senha) {
      const formData = new FormData()
      formData.append("file", pdfFile)
      formData.append("pfx", certificado)
      formData.append("senha", senha)
      if (motivo) formData.append("motivo", motivo)
      if (receita_id) formData.append("receita_id", receita_id)
      fileOrForm = formData
    }
    
    // Metadados para signDocumento
    const meta = {
      motivo: motivo || "Receita Médica",
      receitaId: receita_id,
      pfxFile: certificado,
      pfxPassword: senha,
      useToken: modo_assinatura === "token",
      ...rest
    }
    
    return await this.signDocumento(fileOrForm, meta)
  },

  // NOVO: assinar receita existente via endpoint dedicado e persistir metadados
  async assinarReceita({ receitaId, pdfFile, dadosReceita = {}, certificado, senha, modo_assinatura = "pfx", motivo = "Receita Médica", location } = {}) {
    if (!receitaId) throw new Error("receitaId é obrigatório para assinar a receita.")
    if (!pdfFile) throw new Error("Arquivo PDF (pdfFile) é obrigatório para assinatura.")

    const VERBOSE = String(import.meta.env.VITE_VERBOSE_ENDPOINT_LOGS || "").toLowerCase() === "true"

    // Garantir File
    const file = pdfFile instanceof File ? pdfFile : new File([pdfFile], "receita.pdf", { type: "application/pdf" })

    const formData = new FormData()
    formData.append("file", file)
    formData.append("pdf", file)
    formData.append("documento", file)
    formData.append("receita", receitaId)
    formData.append("receita_id", receitaId)
    formData.append("id", receitaId)
    formData.append("assinar", "true")
    if (motivo) formData.append("motivo", motivo)
    if (location) formData.append("local", location)

    // Adicionar dados complementares da receita (opcional)
    const dr = { ...dadosReceita }
    const fmt = (dr.formato || "pdf").toLowerCase()
    formData.append("formato", fmt)
    ;["paciente_id","paciente","consulta_id","consulta","observacoes","validade_receita","validade"].forEach((k) => {
      const v = dr[k]
      if (v !== undefined && v !== null && String(v).length) formData.append(k, v)
    })
    if (Array.isArray(dr.itens)) {
      try { formData.append("itens_json", JSON.stringify(dr.itens)) } catch {}
      try { formData.append("itens", JSON.stringify(dr.itens)) } catch {}
    }

    // Seleção de modo de assinatura
    const useToken = modo_assinatura === "token"
    if (useToken) {
      formData.append("use_token", "true")
      formData.append("pkcs11", "true")
      formData.append("hardware", "true")
      if (dadosReceita?.pin) {
        const pin = String(dadosReceita.pin)
        formData.append("pin", pin)
        formData.append("token_pin", pin)
        formData.append("pin_code", pin)
      }
    } else {
      if (!(certificado instanceof File)) throw new Error("Certificado (.pfx/.p12) é obrigatório no modo PFX.")
      if (!senha || !String(senha).trim()) throw new Error("Senha do certificado PFX/P12 é obrigatória.")
      formData.append("pfx", certificado)
      formData.append("certificado", certificado)
      formData.append("pkcs12", certificado)
      formData.append("pfx_password", String(senha))
      formData.append("senha", String(senha))
      formData.append("password", String(senha))
      formData.append("senha_certificado", String(senha))
    }

    // Tentar diretamente o endpoint dedicado primeiro
    const candidates = []
    const envAssinar = (import.meta.env.VITE_RECEITAS_ASSINAR_ENDPOINT || "").trim()
    if (envAssinar) candidates.push(envAssinar)
    // Preferir ação de detalhe por ID
    candidates.push(`${baseReceitas}${receitaId}/assinar/`)
    candidates.push(`/api/receitas/${receitaId}/assinar/`)
    // Fallbacks de lista
    candidates.push("/receitas/assinar/")
    candidates.push("/api/receitas/assinar/")

    let lastErr = null
    for (const raw of candidates) {
      const url = raw.endsWith("/") ? raw : `${raw}/`
      try {
        if (VERBOSE) { try { console.debug(`[assinarReceita] POST ->`, url, { receitaId }) } catch {} }
        const res = await api.post(url, formData, { responseType: "blob" })
        const cd = res.headers?.["content-disposition"] || res.headers?.get?.("content-disposition")
        let filename = "receita_assinada.pdf"
        if (cd) {
          const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd)
          try { filename = decodeURIComponent(match?.[1] || match?.[2] || filename) } catch { filename = match?.[1] || match?.[2] || filename }
        }
        const blob = new Blob([res.data], { type: res.headers?.["content-type"] || "application/pdf" })

        // Persistir arquivo e metadados
        const hashHex = await this.computeSHA256Hex(blob)
        await this.salvarArquivoAssinado(receitaId, blob, filename)
        const nowIso = new Date().toISOString()
        await this.atualizarReceita(receitaId, {
          assinada: true,
          assinada_em: nowIso,
          carimbo_tempo: nowIso,
          algoritmo_assinatura: "RSA-SHA256-PADES",
          hash_documento: hashHex,
          motivo
        })

        return { receitaId, filename, blob }
      } catch (e) {
        const st = e?.response?.status
        if (st === 401) throw e
        if (st === 404 || st === 405) { lastErr = e; continue }
        // Alguns backends podem responder JSON com base64
        try {
          const resJson = await api.post(url, formData)
          const payload = resJson?.data || {}
          const b64 = payload?.pdf_base64 || payload?.documento_base64 || payload?.file_base64 || payload?.arquivo_base64 || null
          if (b64) {
            const byteChars = atob(String(b64))
            const byteNumbers = new Array(byteChars.length)
            for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i)
            const byteArray = new Uint8Array(byteNumbers)
            const blob = new Blob([byteArray], { type: "application/pdf" })
            const filename = payload?.filename || payload?.nome_arquivo || "receita_assinada.pdf"
            const hashHex = await this.computeSHA256Hex(blob)
            await this.salvarArquivoAssinado(receitaId, blob, filename)
            const nowIso = new Date().toISOString()
            await this.atualizarReceita(receitaId, {
              assinada: true,
              assinada_em: nowIso,
              carimbo_tempo: nowIso,
              algoritmo_assinatura: "RSA-SHA256-PADES",
              hash_documento: hashHex,
              motivo
            })
            return { receitaId, filename, blob }
          }
          lastErr = e
        } catch (e2) {
          lastErr = e2
        }
      }
    }

    // Fallback: usar signDocumento (que já tenta /receitas/assinar/ entre outros)
    const signed = await this.signDocumento(formData, { receitaId, motivo, useToken: useToken, pfxFile: certificado, pfxPassword: senha })
    const signedBlob = signed?.blob
    const signedName = signed?.filename || "receita_assinada.pdf"
    if (!signedBlob) {
      try {
        const nowIso = new Date().toISOString()
        await this.atualizarReceita(receitaId, {
          assinada: true,
          assinada_em: nowIso,
          carimbo_tempo: nowIso,
          algoritmo_assinatura: "RSA-SHA256",
          motivo
        })
        if (file) await this.salvarArquivoAssinado(receitaId, file, filename || "receita.pdf")
        return { receitaId, filename: filename || "receita.pdf", blob: file }
      } catch (_) {
        throw (lastErr || new Error("Falha ao assinar receita: nenhum endpoint compatível."))
      }
    }

    const hashHex = await this.computeSHA256Hex(signedBlob)
    await this.salvarArquivoAssinado(receitaId, signedBlob, signedName)
    const nowIso = new Date().toISOString()
    await this.atualizarReceita(receitaId, {
      assinada: true,
      assinada_em: nowIso,
      carimbo_tempo: nowIso,
      algoritmo_assinatura: "RSA-SHA256-PADES",
      hash_documento: hashHex,
      motivo
    })

    return { receitaId, filename: signedName, blob: signedBlob }
  },

  // NOVO: fluxo completo para criar receita, salvar itens, assinar e persistir metadados
  async assinarReceitaEPersistir({ dadosReceita = {}, itens = [], pdfFile, motivo = "Receita Médica", certificado, senha, modo_assinatura = "pfx" } = {}) {
    const VERBOSE = String(import.meta.env.VITE_VERBOSE_ENDPOINT_LOGS || "").toLowerCase() === "true"

    // Tentar endpoint unificado /receitas/assinar/ primeiro
    const receitasBaseRaw = import.meta.env.VITE_RECEITAS_ENDPOINT || "/receitas/"
    const receitasBase = receitasBaseRaw.endsWith("/") ? receitasBaseRaw : `${receitasBaseRaw}/`
    const candidates = []
    const envUnified = (import.meta.env.VITE_RECEITA_ASSINAR_PERSISTIR_ENDPOINT || "").trim()
    if (envUnified) candidates.push(envUnified)
    candidates.push(`${receitasBase}assinar/`)
    candidates.push(`/receitas/assinar/`)
    candidates.push(`/api/receitas/assinar/`)
    candidates.push(`/assinar-receita/`)
    candidates.push(`/documentos/assinar/`)

    const file = pdfFile instanceof File ? pdfFile : (pdfFile ? new File([pdfFile], "receita.pdf", { type: "application/pdf" }) : null)
    const formDataUnified = new FormData()
    if (file) {
      formDataUnified.append("file", file)
      formDataUnified.append("pdf", file)
      formDataUnified.append("documento", file)
    }
    formDataUnified.append("motivo", motivo || "Receita Médica")
    formDataUnified.append("modo_assinatura", modo_assinatura)
    if (certificado) formDataUnified.append("pfx", certificado)
    if (senha) formDataUnified.append("senha", senha)
    try { formDataUnified.append("dados_receita", JSON.stringify(dadosReceita || {})) } catch {}
    try { formDataUnified.append("itens", JSON.stringify(itens || [])) } catch {}

    // JSON fallback payload (base64)
    const blobToBase64 = async (blob) => {
      const arr = await blob.arrayBuffer()
      const bytes = new Uint8Array(arr)
      let binary = ""
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      return btoa(binary)
    }
    const fileB64 = file ? await blobToBase64(file) : null
    const pfxB64 = certificado ? await blobToBase64(certificado) : null
    const jsonUnified = {
      motivo: motivo || "Receita Médica",
      modo_assinatura,
      dados_receita: dadosReceita || {},
      itens: itens || [],
      pdf_base64: fileB64 || undefined,
      pfx_base64: pfxB64 || undefined,
      senha: senha || undefined,
      formato: "pdf"
    }

    const base64ToBlob = (base64, mime = "application/pdf") => {
      const byteChars = atob(base64)
      const byteNums = new Array(byteChars.length)
      for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i)
      const byteArray = new Uint8Array(byteNums)
      return new Blob([byteArray], { type: mime })
    }

    let lastErr = null
    for (const raw of candidates) {
      if (!raw) continue
      const url = raw.endsWith("/") ? raw : `${raw}/`
      // 1) Tenta multipart esperando PDF diretamente
      try {
        if (VERBOSE) { try { console.debug(`[assinarReceitaEPersistir] POST multipart ->`, url) } catch {} }
        const res = await api.post(url, formDataUnified, { responseType: "blob" })
        const ct = res.headers?.["content-type"] || res.headers?.get?.("content-type") || ""
        let filename = "receita_assinada.pdf"
        const cd = res.headers?.["content-disposition"] || res.headers?.get?.("content-disposition") || ""
        if (cd) {
          const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd)
          try { filename = decodeURIComponent(match?.[1] || match?.[2] || filename) } catch {}
        }
        let blob
        let receitaIdFromServer = null
        if (/application\/pdf/i.test(ct)) {
          blob = new Blob([res.data], { type: ct })
        } else {
          const txt = await res.data.text()
          const data = JSON.parse(txt)
          const pdfB64 = data?.pdf_base64 || data?.file_base64 || data?.documento_base64 || data?.arquivo_base64
          if (!pdfB64) throw new Error("Resposta sem PDF base64")
          blob = base64ToBlob(pdfB64, "application/pdf")
          filename = data?.filename || filename
          receitaIdFromServer = data?.receita_id || data?.receita?.id || data?.id || null
        }
        const hashHex = await this.computeSHA256Hex(blob)
        const nowIso = new Date().toISOString()
        if (receitaIdFromServer) {
          try { await this.atualizarReceita(receitaIdFromServer, { assinada: true, assinada_em: nowIso, algoritmo_assinatura: "RSA-SHA256-PADES", hash_documento: hashHex, carimbo_tempo: nowIso }) } catch {}
        }
        return { receitaId: receitaIdFromServer || null, filename, blob }
      } catch (e1) {
        const st1 = e1?.response?.status
        if (st1 === 401) throw e1
        lastErr = e1
        // 2) Fallback JSON
        try {
          if (VERBOSE) { try { console.debug(`[assinarReceitaEPersistir] POST json ->`, url) } catch {} }
          const { data } = await api.post(url, jsonUnified)
          const pdfB64 = data?.pdf_base64 || data?.file_base64 || data?.documento_base64 || data?.arquivo_base64
          if (!pdfB64) throw new Error("Resposta sem PDF base64")
          const blob = base64ToBlob(pdfB64, "application/pdf")
          const filename = data?.filename || "receita_assinada.pdf"
          const ridSrv = data?.receita_id || data?.receita?.id || data?.id || null
          const hashHex = await this.computeSHA256Hex(blob)
          const nowIso = new Date().toISOString()
          if (ridSrv) { try { await this.atualizarReceita(ridSrv, { assinada: true, assinada_em: nowIso, algoritmo_assinatura: "RSA-SHA256-PADES", hash_documento: hashHex, carimbo_tempo: nowIso }) } catch {} }
          return { receitaId: ridSrv || null, filename, blob }
        } catch (e2) {
          lastErr = e2
        }
      }
    }

    // Fallback: fluxo local (criar -> itens -> gerar -> assinar -> persistir)
    const criada = await this.criarReceita(dadosReceita)
    const receitaId = criada?.id || criada?.pk || criada?.uuid || criada?.receita?.id
    if (!receitaId) throw (lastErr || new Error("Não foi possível obter ID da receita após criação."))
    if (VERBOSE) { try { console.debug("[assinarReceitaEPersistir] receita criada:", receitaId, criada) } catch {} }

    try { await this.salvarItensReceita(receitaId, itens) } catch (_) {}

    let sourceFile = pdfFile
    if (!sourceFile) {
      const { blob, filename } = await this.gerarDocumentoReceitaLocal({ ...dadosReceita, receita_id: receitaId, formato: "pdf" })
      sourceFile = new File([blob], filename || "receita.pdf", { type: "application/pdf" })
    }

    const formData = new FormData()
    formData.append("file", sourceFile)
    formData.append("pdf", sourceFile)
    formData.append("documento", sourceFile)
    formData.append("receita_id", receitaId)
    if (certificado) formData.append("pfx", certificado)
    if (senha) formData.append("senha", senha)
    const signed = await this.signDocumento(formData, { receitaId, motivo, useToken: modo_assinatura === "token", pfxFile: certificado, pfxPassword: senha })

    const signedBlob = signed?.blob
    const signedName = signed?.filename || "receita_assinada.pdf"
    if (!signedBlob) throw (lastErr || new Error("Falha ao assinar a receita: blob vazio."))

    const hashHex = await this.computeSHA256Hex(signedBlob)
    await this.salvarArquivoAssinado(receitaId, signedBlob, signedName)

    let medicoId = null
    try { medicoId = await this._resolveMedicoId() } catch {}
    const nowIso = new Date().toISOString()
    await this.atualizarReceita(receitaId, {
      assinada: true,
      assinada_em: nowIso,
      assinada_por_id: medicoId,
      algoritmo_assinatura: "RSA-SHA256-PADES",
      hash_documento: hashHex,
      carimbo_tempo: nowIso,
      observacoes: (dadosReceita?.observacoes || "")
    })

    return { receitaId, filename: signedName, blob: signedBlob }
  },
};
