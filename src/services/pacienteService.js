import api from "./api"
import { authService } from "./authService"
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "V.25"

export const pacienteService = {
  async getPerfil() {
    try {
      // Usar o endpoint real da API para buscar o perfil do usuário
      const endpoint = import.meta.env.VITE_USER_PROFILE_ENDPOINT || "/api/users/"
      const user = authService.getCurrentUser()
      if (!user?.id) throw new Error("Usuário não encontrado na sessão. Faça login novamente.")
      
      const base = endpoint.endsWith("/") ? endpoint : `${endpoint}/`
      console.log('[DEBUG] Buscando perfil do usuário via:', `${base}${user.id}/`)
      
      const response = await api.get(`${base}${user.id}/`)
      console.log('[DEBUG] Perfil do usuário carregado:', response.data)
      return response.data
    } catch (error) {
      console.error('[DEBUG] Erro ao buscar perfil do usuário:', error?.response?.status, error?.response?.data)
      
      // Fallback: retornar dados do usuário atual do storage se a API falhar
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        console.log('[DEBUG] Usando dados do usuário do storage como fallback:', currentUser);
        return currentUser;
      }
      
      throw error;
    }
  },

  async atualizarPerfil(perfilData) {
    try {
      // Usar o endpoint real da API para atualizar o perfil do usuário
      const endpoint = import.meta.env.VITE_USER_PROFILE_ENDPOINT || "/api/users/"
      const user = authService.getCurrentUser()
      if (!user?.id) throw new Error("Usuário não encontrado na sessão. Faça login novamente.")

      const base = endpoint.endsWith("/") ? endpoint : `${endpoint}/`
      const payload = { ...perfilData }

      // Normalizar campos
      if (payload.first_name === undefined && payload.nome) payload.first_name = String(payload.nome).split(" ")[0] || ""
      if (payload.last_name === undefined && payload.nome) payload.last_name = String(payload.nome).split(" ").slice(1).join(" ") || ""

      if (payload.telefone === undefined && payload.phone) payload.telefone = payload.phone
      if (payload.endereco === undefined && payload.address) payload.endereco = payload.address

      // Limpar campos não suportados
      delete payload.nome
      delete payload.phone
      delete payload.address

      // remove undefined
      Object.keys(payload).forEach((k) => {
        if (payload[k] === undefined) delete payload[k]
      })

      const response = await api.patch(`${base}${user.id}/`, payload)
      return response.data
    } catch (error) {
      console.error('[DEBUG] Erro ao atualizar perfil do usuário:', error?.response?.status, error?.response?.data)
      throw error
    }
  },

  async getConsultas(params = {}) {
    try {
      const endpoint = import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/"
      console.log('[DEBUG] Endpoint de consultas:', endpoint)
      
      const paciente = await this.getPacienteDoUsuario()
      console.log('[DEBUG] Paciente encontrado:', paciente)

      const queryParams = { ...params }
      if (paciente?.id && !queryParams.paciente) {
        queryParams.paciente = paciente.id
      }

      console.log('[DEBUG] Query params:', queryParams)

      // Se não temos paciente e nenhum filtro informado, evita bater no backend
      if (!paciente?.id && Object.keys(queryParams).length === 0) {
        console.log('[DEBUG] Sem paciente e sem filtros, retornando array vazio')
        return { results: [] }
      }

      console.log('[DEBUG] Fazendo requisição para:', endpoint, 'com params:', queryParams)
      const response = await api.get(endpoint, { params: queryParams })
      console.log('[DEBUG] Resposta da API recebida:', response.data)
      return response.data
    } catch (error) {
      console.warn('[pacienteService] getConsultas falhou:', error?.response?.status, error?.response?.data)
      console.error('[DEBUG] Erro completo:', error)
      return { results: [] }
    }
  },

  async getExames(params = {}) {
    try {
      const endpoint = import.meta.env.VITE_EXAMES_ENDPOINT || "/exames/"
      const paciente = await this.getPacienteDoUsuario().catch(() => null)
      const queryParams = { ...params }
      if (paciente?.id && !queryParams.paciente) queryParams.paciente = paciente.id

      if (!paciente?.id && Object.keys(queryParams).length === 0) {
        return { results: [] }
      }

      const response = await api.get(endpoint, { params: queryParams })
      return response.data
    } catch (error) {
      console.warn('[pacienteService] getExames falhou:', error?.response?.status)
      return { results: [] }
    }
  },

  async getProntuario(params = {}) {
    try {
      const endpoint = import.meta.env.VITE_PRONTUARIO_ENDPOINT || "/prontuarios/"
      const paciente = await this.getPacienteDoUsuario().catch(() => null)
      const queryParams = { ...params }
      if (paciente?.id && !queryParams.paciente) queryParams.paciente = paciente.id
      if (!paciente?.id && Object.keys(queryParams).length === 0) {
        return { results: [] }
      }
      const response = await api.get(endpoint, { params: queryParams })
      return response.data
    } catch (error) {
      console.warn('[pacienteService] getProntuario falhou:', error?.response?.status)
      return { results: [] }
    }
  },

  async getMedicos(params = {}) {
    const endpoint = import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/"
    const response = await api.get(endpoint, { params })
    return response.data
  },

  async getMedicoById(id) {
    const endpointRaw = import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/"
    const base = endpointRaw.endsWith("/") ? endpointRaw : `${endpointRaw}/`
    const res = await api.get(`${base}${id}/`)
    return res.data
  },

  async agendarConsulta({ medico, data, hora, modalidade, local, observacoes, tipo, motivo }) {
    const agBase = (import.meta.env.VITE_AGENDAMENTOS_ENDPOINT || "/agendamentos/").replace(/\/?$/, "/")
    const consBase = (import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/").replace(/\/?$/, "/")
    const paciente = await this.getPacienteDoUsuario()

    // Combina data e hora em ISO para compatibilidade com backends que exigem "data_hora"
    const dataIso = data ? `${data}${hora ? `T${hora}:00` : 'T00:00:00'}` : undefined

    // Normalizar "tipo" para escolhas comuns de backends
    const normalizeTipo = (t) => {
      const s = String(t || '').toLowerCase().trim()
      const map = {
        'primeira consulta': 'inicial',
        'primeira': 'inicial',
        'consulta inicial': 'inicial',
        'inicial': 'inicial',
        'retorno': 'retorno',
        'follow-up': 'retorno',
        'rotina': 'rotina',
        'checkup': 'rotina',
      }
      return map[s] || s || undefined
    }

    const tipoNorm = normalizeTipo(tipo)

  const payloadBase = {
      medico,
      medico_id: medico,
      paciente: paciente?.id,
      data,
      hora,
      data_hora: dataIso,
      inicio: dataIso,
      horario: hora,
      modalidade,
      local,
      observacoes,
      tipo: tipoNorm,
      motivo,
    }

    // Remover campos vazios/undefined
    const clean = {}
    Object.entries(payloadBase).forEach(([k, v]) => {
      if (v === undefined || v === null) return
      if (typeof v === 'string' && v.trim() === '') return
      clean[k] = v
    })

    // Tenta POST com payload normalizado; se falhar por validação do "tipo", tenta com fallback
    const candidates = [agBase, consBase]
    let lastErr = null
    for (const url of candidates) {
      try {
        const endpoint = url.endsWith("/") ? url : `${url}/`
        const response = await api.post(endpoint, { ...clean, paciente: paciente?.id, paciente_id: paciente?.id, status: "PENDENTE", situacao: "PENDENTE", state: "PENDENTE" })
        try {
          const { secretariaService } = await import("@/services/secretariaService")
          await secretariaService.registrarSolicitacao({
            medico: clean.medico || clean.medico_id,
            paciente: paciente?.id,
            paciente_id: paciente?.id,
            data: clean.data,
            hora: clean.hora,
            modalidade: clean.modalidade,
            tipo: clean.tipo,
            motivo: clean.motivo,
            observacoes: clean.observacoes,
            status: "pendente",
          })
        } catch (_) {}
        return response.data
      } catch (e1) {
        lastErr = e1
        // continua para próximo candidato
      }
    }
    // Se falhou em ambos, aplicar fallback de normalização de tipo
    try {
      const st = lastErr?.response?.status
      const body = lastErr?.response?.data
      const hasTipoError = body && (body.tipo || (typeof body?.detail === 'string' && body.detail.toLowerCase().includes('tipo')))
      if (st && [400, 422].includes(st) && hasTipoError) {
        // 1) Tentar com tipo=rotina
        for (const url of candidates) {
          try {
            const endpoint = url.endsWith("/") ? url : `${url}/`
            const response = await api.post(endpoint, { ...clean, tipo: 'rotina', paciente: paciente?.id, paciente_id: paciente?.id, status: 'PENDENTE', situacao: 'PENDENTE', state: 'PENDENTE' })
            try {
              const { secretariaService } = await import("@/services/secretariaService")
              await secretariaService.registrarSolicitacao({ ...clean, tipo: 'rotina', paciente: paciente?.id, paciente_id: paciente?.id, status: 'PENDENTE' })
            } catch (_) {}
            return response.data
          } catch (e2) {}
        }
        // 2) Sem tipo
        for (const url of candidates) {
          try {
            const endpoint = url.endsWith("/") ? url : `${url}/`
            const { tipo: _omit, ...noTipo } = clean
            const response = await api.post(endpoint, { ...noTipo, paciente: paciente?.id, paciente_id: paciente?.id, status: 'PENDENTE', situacao: 'PENDENTE', state: 'PENDENTE' })
            try {
              const { secretariaService } = await import("@/services/secretariaService")
              await secretariaService.registrarSolicitacao({ ...noTipo, paciente: paciente?.id, paciente_id: paciente?.id, status: 'PENDENTE' })
            } catch (_) {}
            return response.data
          } catch (e3) {}
        }
      }
      throw lastErr
    } catch (eFinal) {
      throw eFinal
    }
  },

  async getAgendaMedico({ medico, date, apenas_disponiveis = true }) {
    const endpointRaw = import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/"
    const base = endpointRaw.endsWith("/") ? endpointRaw : `${endpointRaw}/`

    const params = {}
    if (date) params.date = date
    if (apenas_disponiveis) params.apenas_disponiveis = true

    const res = await api.get(`${base}${medico}/agenda/`, { params })
    const data = res?.data || []
    const horarios = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
    return horarios
  },

  async getPacienteDoUsuario() {
    // 1) tenta endpoint dedicado
    const endpointMe = import.meta.env.VITE_PACIENTE_ME_ENDPOINT
    if (endpointMe) {
      const urlMe = endpointMe.endsWith("/") ? endpointMe : `${endpointMe}/`
      try {
        const resp = await api.get(urlMe)
        return resp.data
      } catch (e) {
        if (e?.response?.status === 401) throw e
      }
    }

    // 2) fallback: busca lista filtrada por usuário
    const baseRaw = import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/"
    const base = baseRaw.endsWith("/") ? baseRaw : `${baseRaw}/`

    try {
      // tentar por user atual
      const u = authService.getCurrentUser()
      const uid = u?.id || u?.user_id
      if (uid) {
        const resp = await api.get(base, { params: { user: uid, user_id: uid } })
        const list = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp?.data?.results) ? resp.data.results : [])
        const found = list?.[0] || null
        if (found) return found
      }
    } catch (_) {}

    // 3) último fallback: tenta /me/
    try {
      const resp = await api.get(`${base}me/`)
      return resp.data
    } catch (_) {}

    throw new Error("Paciente não encontrado para o usuário atual.")
  },

  async atualizarPaciente(pacienteData) {
    const baseRaw = import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/"
    const base = baseRaw.endsWith("/") ? baseRaw : `${baseRaw}/`

    const payload = {}
    if (pacienteData == null || typeof pacienteData !== "object") {
      throw new Error("Dados inválidos para atualização do paciente")
    }

    // Mapear e normalizar campos comuns
    if ("nome" in pacienteData) payload.nome = String(pacienteData.nome || "").trim()
    if ("first_name" in pacienteData) payload.first_name = String(pacienteData.first_name || "").trim()
    if ("last_name" in pacienteData) payload.last_name = String(pacienteData.last_name || "").trim()
    if ("telefone" in pacienteData) payload.telefone = pacienteData.telefone?.trim?.() || "";
    if ("data_nascimento" in pacienteData) payload.data_nascimento = pacienteData.data_nascimento;

    // remove undefined, mantendo null/string vazia quando intencional
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });

    // Preferir endpoint /me/ com fallback para recurso específico
    try {
      const resp = await api.patch(`${base}me/`, payload);
      return resp.data;
    } catch (_) {
      const paciente = await this.getPacienteDoUsuario();
      if (!paciente?.id) {
        throw new Error("Paciente não identificado para atualização.");
      }
      const resp = await api.patch(`${base}${paciente.id}/`, payload);
      return resp.data;
    }
  },

  async getReceitas(params = {}) {
    const configured = String(import.meta.env.VITE_RECEITAS_ENDPOINT || "/receitas/").trim()
    const endpoint = configured.endsWith("/") ? configured : `${configured}/`

    const { __propagateErrors, ...cleanParams } = params || {}
    const queryParams = { ...cleanParams }

    let pacienteId = null
    try {
      const paciente = await this.getPacienteDoUsuario().catch(() => null)
      if (paciente?.id) {
        pacienteId = paciente.id
        const pid = paciente.id
        // Preferir filtros suportados pelo backend
        queryParams["paciente"] = pid
        queryParams["paciente_id"] = pid
        queryParams["consulta__paciente"] = pid
      }
    } catch (_) {}

    // Mesmo sem pacienteId, tentar buscar receitas gerais; filtros acima reduzirão para o paciente quando possível

    try {
      if (pacienteId) {
        const basePacRaw = import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/"
        const basePac = basePacRaw.endsWith("/") ? basePacRaw : `${basePacRaw}/`
        try {
          const resp = await api.get(`${basePac}${pacienteId}/receitas/`)
          const data = resp?.data
          let list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
          if (list.length) return { results: list }
        } catch (_) {}
      }

      const candidates = [endpoint]
      if (!endpoint.startsWith("/api/") && endpoint.startsWith("/")) candidates.push(`/api${endpoint}`)
      if (!candidates.includes("/receitas/")) candidates.push("/receitas/")

      let data = null
      let lastErr = null
      for (const url of candidates) {
        try {
          const res = await api.get(url, { params: queryParams })
          data = res?.data
          break
        } catch (e) {
          lastErr = e
          continue
        }
      }
      if (!data && lastErr) throw lastErr
      let list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
      // Fallback: se vier lista geral, filtra pelo paciente vinculado à consulta
      if (pacienteId && Array.isArray(list) && list.length) {
        try { console.debug(`[${APP_VERSION}] Filtrando receitas por paciente`, pacienteId) } catch {}
        list = list.filter((r) => {
          const pidA = r?.paciente?.id || r?.paciente
          const pidB = r?.consulta?.paciente?.id || r?.consulta?.paciente
          return String(pidA || pidB || "") === String(pacienteId)
        })
      }

      // Carregar itens para cada receita
      const receitaItensEndpoint = String(import.meta.env.VITE_RECEITA_ITENS_ENDPOINT || "").trim()
      if (receitaItensEndpoint && list.length > 0) {
        const itensEndpoint = receitaItensEndpoint.endsWith("/") ? receitaItensEndpoint : `${receitaItensEndpoint}/`
        
        for (let receita of list) {
          try {
            const itensRes = await api.get(itensEndpoint, { 
              params: { receita: receita.id } 
            })
            const itensData = itensRes?.data
            const itensList = Array.isArray(itensData) ? itensData : (Array.isArray(itensData?.results) ? itensData.results : [])
            receita.itens = itensList
          } catch (err) {
            console.warn(`Erro ao carregar itens da receita ${receita.id}:`, err)
            receita.itens = []
          }
        }
      }

      const byId = new Map()
      ;[...list].forEach((r) => {
        if (!r) return
        const k = r.id ?? `${r.created_at}-${r.medicamentos}`
        if (!byId.has(k)) byId.set(k, r)
      })

      const merged = Array.from(byId.values())

      const normalizeUrl = (u) => {
        if (!u) return u
        if (/^https?:\/\//i.test(u) || /^(data|blob):/i.test(u)) return u
        const runtime = (() => {
          try { return window.__API_BASE_URL || window.localStorage?.getItem('api_url') || null } catch { return null }
        })()
        const origin = (runtime || import.meta.env.VITE_API_URL || "").replace(/\/$/, "")
        const path = u.startsWith("/") ? u : `/${u}`
        return `${origin}${path}`
      }

      const mergedNormalized = merged.map((r) => {
        const arquivo = r.arquivo_assinado || r.arquivoAssinado || r?.arquivo?.url || r?.pdf_url || r?.download_url
        if (arquivo && !r.arquivo_assinado) {
          return { ...r, arquivo_assinado: normalizeUrl(arquivo) }
        }
        if (r.arquivo_assinado) {
          return { ...r, arquivo_assinado: normalizeUrl(r.arquivo_assinado) }
        }
        return r
      })

      return { results: mergedNormalized }
    } catch (error) {
      const st = error?.response?.status
      if (__propagateErrors === true && st && ![404, 405, 500].includes(st)) throw error
      return { results: [] }
    }
  },

  async getMedicosVinculados() {
    const basePacRaw = import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/"
    const basePac = basePacRaw.endsWith("/") ? basePacRaw : `${basePacRaw}/`
    const paciente = await this.getPacienteDoUsuario()
    if (!paciente?.id) return []
    const res = await api.get(`${basePac}${paciente.id}/medicos/`)
    return Array.isArray(res.data) ? res.data : []
  },

  async solicitarReceita({ medico, mensagem, receita }) {
    const basePacRaw = import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/"
    const basePac = basePacRaw.endsWith("/") ? basePacRaw : `${basePacRaw}/`
    const paciente = await this.getPacienteDoUsuario()
    if (!paciente?.id) throw new Error("Paciente não identificado.")
    const payload = {
      medico,
      ...(mensagem ? { mensagem } : {}),
      ...(receita ? { receita, receita_id: receita } : {}),
    }
    const res = await api.post(`${basePac}${paciente.id}/solicitar_receita/`, payload)
    return res.data
  },

  // Nova ação: solicitar renovação de receita
  async solicitarRenovacao({ medico, mensagem, receita }) {
    const basePacRaw = import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/"
    const basePac = basePacRaw.endsWith("/") ? basePacRaw : `${basePacRaw}/`
    const paciente = await this.getPacienteDoUsuario()
    if (!paciente?.id) throw new Error("Paciente não identificado.")

    const payload = {
      medico,
      tipo: "renovacao",
      ...(mensagem ? { mensagem } : {}),
      ...(receita ? { receita, receita_id: receita } : {}),
    }

    const endpoints = [
      `${basePac}${paciente.id}/solicitar_renovacao/`,
      `${basePac}${paciente.id}/solicitacoes/renovacao/`,
      `${basePac}${paciente.id}/renovar_receita/`,
      `${basePac}${paciente.id}/solicitacao/receita/renovacao/`,
    ]

    let lastErr
    for (const ep of endpoints) {
      try {
        const res = await api.post(ep, payload)
        return res.data
      } catch (err) {
        lastErr = err
        const st = err?.response?.status
        if (st && ![404, 405].includes(st)) {
          // Erros relevantes: encerra cedo
          break
        }
      }
    }
    if (lastErr) throw lastErr
    throw new Error("Não foi possível enviar a solicitação de renovação.")
  },
  async getDashboard() {
    const envEndpoint = import.meta.env.VITE_PACIENTE_DASHBOARD_ENDPOINT
    if (envEndpoint) {
      const endpoint = envEndpoint.endsWith("/") ? envEndpoint : `${envEndpoint}/`
      try {
        const res = await api.get(endpoint)
        return res.data
      } catch (err) {
        if (err?.response?.status !== 404) {
          console.warn("[pacienteService] Dashboard dedicado falhou:", err?.response?.status)
        }
      }
    }

    try {
      const now = new Date()

      const toList = (data) => Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])

      const [consultasData, examesData, receitasData, medicosVinc] = await Promise.all([
        this.getConsultas().catch(() => ({ results: [] })),
        this.getExames().catch(() => ({ results: [] })),
        this.getReceitas().catch(() => ({ results: [] })),
        this.getMedicosVinculados().catch(() => []),
      ])

      const consultas = toList(consultasData)
      const exames = toList(examesData)
      const receitas = toList(receitasData)

      const isSameMonth = (d) => {
        const dt = new Date(d)
        const m = dt.getMonth(), y = dt.getFullYear()
        return m === now.getMonth() && y === now.getFullYear()
      }

      const consultasNormalizadas = consultas.map((c) => ({
        id: c.id || c.consulta_id,
        data_hora: c.data_hora || c.horario || c.inicio || c.data || c.start_time || null,
        status: c.status || "Agendada",
        tipo: c.tipo || c.modalidade || "Consulta",
        especialidade: c.especialidade || c.medico_especialidade || null,
        medico_nome: c.medico_nome || c?.medico?.nome || (c?.medico?.user ? [c.medico.user.first_name, c.medico.user.last_name].filter(Boolean).join(" ").trim() : undefined),
      }))

      const proximasConsultas = consultasNormalizadas
        .filter((c) => c.data_hora && new Date(c.data_hora) >= now)
        .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora))
        .slice(0, 5)

      const consultasMes = consultasNormalizadas.filter((c) => c.data_hora && isSameMonth(c.data_hora)).length

      const examesNormalizados = exames.map((e) => ({
        id: e.id,
        tipo: e.tipo || e.nome || e.categoria || "Exame",
        status: e.status || e.situacao || "Pendente",
        data_agendamento: e.data_agendamento || e.agendamento || e.data || null,
        medico_solicitante: e.medico_solicitante || e.medico || undefined,
      }))

      const proximosExames = examesNormalizados
        .filter((e) => e.data_agendamento && new Date(e.data_agendamento) >= now)
        .sort((a, b) => new Date(a.data_agendamento) - new Date(b.data_agendamento))
        .slice(0, 5)

      const examesRealizadosMes = examesNormalizados.filter((e) => isSameMonth(e.data_agendamento) && ["realizado", "concluido", "concluído", "finalizado"].includes(String(e.status).toLowerCase())).length

      const receitasAtivas = toList(receitas).filter((r) => ["ativa", "valida", "válida"].includes(String(r.status || r.situacao || "").toLowerCase())).length

      return {
        consultasMes,
        consultasProximas: proximasConsultas.length,
        examesPendentes: examesNormalizados.filter((e) => String(e.status).toLowerCase() === "pendente").length,
        examesRealizadosMes,
        receitasAtivas,
        medicosVinculados: Array.isArray(medicosVinc) ? medicosVinc.length : 0,
        proximasConsultas,
        proximosExames,
      }
    } catch (err) {
      console.warn("[pacienteService] getDashboard fallback falhou:", err?.response?.status)
      return null
    }
  },

  async garantirPacienteDoUsuario(initialData = {}) {
    try {
      const existente = await this.getPacienteDoUsuario()
      if (existente?.id) return existente
    } catch (_) {}

    const baseRaw = import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/"
    const base = baseRaw.endsWith("/") ? baseRaw : `${baseRaw}/`

    const payload = { ...initialData }
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k]
    })

    try {
      const resp = await api.post(`${base}me/`, payload)
      return resp.data
    } catch (err) {
      console.debug("[pacienteService] POST /pacientes/me/ falhou:", err?.response?.status)
    }

    try {
      const resp = await api.post(base, payload)
      if (resp?.data) return resp.data
    } catch (err2) {
      console.debug("[pacienteService] POST /pacientes/ falhou:", err2?.response?.status)
    }

    try {
      const criado = await this.getPacienteDoUsuario()
      if (criado?.id) return criado
    } catch (_) {}

    throw new Error("Não foi possível criar o perfil de paciente para o usuário atual.")
  },
}
