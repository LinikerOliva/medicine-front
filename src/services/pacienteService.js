import api from "./api"
import { authService } from "./authService"

export const pacienteService = {
  async getPerfil() {
    const endpoint = import.meta.env.VITE_USER_PROFILE_ENDPOINT || "/users/"
    const user = authService.getCurrentUser()
    if (!user?.id) throw new Error("Usuário não encontrado na sessão. Faça login novamente.")
    const base = endpoint.endsWith("/") ? endpoint : `${endpoint}/`
    const response = await api.get(`${base}${user.id}/`)
    return response.data
  },

  async atualizarPerfil(perfilData) {
    const endpoint = import.meta.env.VITE_USER_PROFILE_ENDPOINT || "/users/"
    const user = authService.getCurrentUser()
    if (!user?.id) throw new Error("Usuário não encontrado na sessão. Faça login novamente.")
    const base = endpoint.endsWith("/") ? endpoint : `${endpoint}/`
    const response = await api.patch(`${base}${user.id}/`, perfilData)
    return response.data
  },

  async getConsultas(params = {}) {
    try {
      const endpoint = import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/"
      const paciente = await this.getPacienteDoUsuario()

      const queryParams = { ...params }
      if (paciente?.id && !queryParams.paciente) {
        queryParams.paciente = paciente.id
      }

      // Se não temos paciente e nenhum filtro informado, evita bater no backend
      if (!paciente?.id && Object.keys(queryParams).length === 0) {
        return { results: [] }
      }

      const response = await api.get(endpoint, { params: queryParams })
      return response.data
    } catch (error) {
      console.warn('[pacienteService] getConsultas falhou:', error?.response?.status)
      return { results: [] }
    }
  },

  async getExames(params = {}) {
    const endpoint = import.meta.env.VITE_EXAMES_ENDPOINT || "/exames/"

    // remove flag interna de propagação de erro antes do request
    const { __propagateErrors, ...cleanParams } = params || {}

    // evitar depender de 'this' (caso o método seja desestruturado em outro lugar)
    let paciente = null
    try {
      paciente = await pacienteService.getPacienteDoUsuario()
    } catch (e) {
      console.debug("[pacienteService] getPacienteDoUsuario falhou, prosseguindo sem filtro de paciente", e?.response?.status)
    }

    const queryParams = { ...cleanParams }
    if (paciente?.id && !queryParams.paciente) {
      queryParams.paciente = paciente.id
    }

    // limpar params inválidos para não enviar undefined/null/""
    Object.keys(queryParams).forEach((k) => {
      if (queryParams[k] === undefined || queryParams[k] === null || queryParams[k] === "") {
        delete queryParams[k]
      }
    })

    // Evita requisição se não houver paciente e nenhum filtro
    if (!paciente?.id && Object.keys(queryParams).length === 0) {
      return { results: [] }
    }

    try {
      console.debug("[pacienteService] GET exames", { endpoint, params: queryParams })
      const response = await api.get(endpoint, { params: queryParams })
      return response.data
    } catch (error) {
      console.warn("[pacienteService] getExames falhou:", error?.response?.status, error?.response?.data)
      if (__propagateErrors === true) {
        throw error
      }
      // mantém o shape anterior para não quebrar consumidores
      return { results: [] }
    }
  },

  // Este é o método que efetivamente fica valendo (sobrescreve o anterior).
  // Ajustado para filtrar por consulta__paciente, como o backend espera.
  async getProntuario(params = {}) {
    const endpoint = import.meta.env.VITE_PRONTUARIOS_ENDPOINT || "/prontuarios/"
    const { __propagateErrors, ...cleanParams } = params || {}
    const queryParams = { ...cleanParams }

    let temPaciente = false
    try {
      const paciente = await this.getPacienteDoUsuario()
      if (paciente?.id && !queryParams["consulta__paciente"]) {
        queryParams["consulta__paciente"] = paciente.id
        temPaciente = true
      }
    } catch (_) {}

    // Evita requisição se não houver paciente e nenhum filtro explícito
    if (!temPaciente && Object.keys(queryParams).length === 0) {
      return { results: [] }
    }

    try {
      const response = await api.get(endpoint, { params: queryParams })
      return response.data
    } catch (error) {
      if (__propagateErrors === true) throw error
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
    const endpointRaw = import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/"
    const endpoint = endpointRaw.endsWith("/") ? endpointRaw : `${endpointRaw}/`

    const paciente = await this.getPacienteDoUsuario()
    if (!paciente?.id) {
      throw new Error("Não foi possível identificar o paciente autenticado.")
    }

    const toIsoDateTime = (d, t) => {
      if (!d || !t) return null
      const dt = new Date(`${d}T${t}`)
      if (isNaN(dt)) return null
      return dt.toISOString()
    }

    // Normalizar tipo para o backend
    const mapTipo = (v) => {
      const m = {
        primeira: "primeira_consulta",
        primeira_consulta: "primeira_consulta",
        retorno: "retorno",
        urgencia: "urgencia",
        rotina: "rotina",
      }
      const k = String(v || "").toLowerCase()
      return m[k] || "primeira_consulta"
    }

    const payload = {
      // Garantir compatibilidade com backend: enviar paciente explicitamente
      paciente: paciente.id,
      medico,
      data_hora: toIsoDateTime(data, hora) || data || null,
      tipo: mapTipo(tipo),
      motivo, // OBRIGATÓRIO no backend
      observacoes: observacoes || undefined,
      duracao_minutos: 30,
    }

    // limpar campos nulos/undefined para não poluir o payload
    Object.keys(payload).forEach((k) => {
      if (payload[k] === null || payload[k] === undefined || payload[k] === "") {
        delete payload[k]
      }
    })

    const response = await api.post(endpoint, payload)
    return response.data
  },

  async getAgendaMedico({ medico, date, apenas_disponiveis = true }) {
    const base = import.meta.env.VITE_AGENDAMENTOS_ENDPOINT || "/agendamentos/"
    const params = {
      medico,
      medico_id: medico,
      date,
      data: date,
      ...(apenas_disponiveis ? { apenas_disponiveis: 1 } : {}),
    }
    const res = await api.get(base, { params })
    return res.data
  },

  // NOVO: obter o registro de Paciente do usuário autenticado, com fallbacks
  // NOVO fluxo mais resiliente para evitar múltiplos 500
  // dentro do objeto pacienteService
  async getPacienteDoUsuario() {
    const baseRaw = import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/";
    const base = baseRaw.endsWith("/") ? baseRaw : `${baseRaw}/`;

    // 1) Tenta /pacientes/me/ primeiro (action do backend)
    try {
      const me = await api.get(`${base}me/`);
      return me.data;
    } catch (err) {
      console.warn("[pacienteService] GET /pacientes/me/ falhou:", err?.response?.status);
    }

    // 2) Fallback por filtro de usuário
    const user = authService.getCurrentUser();
    if (!user?.id) return null;

    const keys = ["user", "user__id", "user_id"];
    for (const key of keys) {
      try {
        const res = await api.get(base, { params: { [key]: user.id } });
        const items = Array.isArray(res.data?.results) ? res.data.results : res.data;
        if (Array.isArray(items) && items.length) return items[0] || null;
      } catch (e) {
        console.debug(`[pacienteService] Filtro ?${key}= falhou:`, e?.response?.status);
      }
    }

    return null;
  },

  // NOVO: atualizar dados do Paciente (tipo_sanguineo, alergias, condicoes_cronicas, etc.)
  async atualizarPaciente(pacienteData) {
    const baseRaw = import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/"
    const base = baseRaw.endsWith("/") ? baseRaw : `${baseRaw}/`

    const toText = (v) => {
      if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean).join(", ");
      if (typeof v === "string") return v.trim();
      return v == null ? "" : String(v);
    };

    const normalizeDecimal = (n) => {
      if (n === undefined || n === null || n === "") return undefined;
      if (typeof n === "string") n = n.replace(",", ".").trim();
      const parsed = Number(n);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const payload = {};
    if ("tipo_sanguineo" in pacienteData) payload.tipo_sanguineo = pacienteData.tipo_sanguineo;
    if ("alergias" in pacienteData) payload.alergias = toText(pacienteData.alergias);
    if ("condicoes_cronicas" in pacienteData) payload.condicoes_cronicas = toText(pacienteData.condicoes_cronicas);

    if ("peso" in pacienteData) {
      const v = normalizeDecimal(pacienteData.peso);
      if (v !== undefined) payload.peso = v;
    }
    if ("altura" in pacienteData) {
      const v = normalizeDecimal(pacienteData.altura);
      if (v !== undefined) payload.altura = v;
    }

    if ("contato_emergencia_nome" in pacienteData) payload.contato_emergencia_nome = pacienteData.contato_emergencia_nome?.trim?.() || "";
    if ("contato_emergencia_telefone" in pacienteData) payload.contato_emergencia_telefone = pacienteData.contato_emergencia_telefone?.trim?.() || "";
    if ("plano_saude" in pacienteData) payload.plano_saude = pacienteData.plano_saude?.trim?.() || "";
    if ("numero_carteirinha" in pacienteData) payload.numero_carteirinha = pacienteData.numero_carteirinha?.trim?.() || "";

    // campos adicionais do formulário que pertencem ao modelo de Paciente (se existirem no backend)
    if ("endereco" in pacienteData) payload.endereco = pacienteData.endereco?.trim?.() || "";
    if ("telefone" in pacienteData) payload.telefone = pacienteData.telefone?.trim?.() || "";
    if ("data_nascimento" in pacienteData) payload.data_nascimento = pacienteData.data_nascimento;

    // remove undefined, mantendo null/string vazia quando intencional
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });

    // Preferir endpoint /me/ com fallback para recurso específico
    try {
      console.debug("[pacienteService] PATCH /pacientes/me/ payload:", payload);
      const resp = await api.patch(`${base}me/`, payload);
      return resp.data;
    } catch (_) {
      // fallback para PATCH direto no recurso
      const paciente = await this.getPacienteDoUsuario();
      if (!paciente?.id) {
        throw new Error("Paciente não identificado para atualização.");
      }
      console.debug(`[pacienteService] PATCH /pacientes/${paciente.id}/ payload:`, payload);
      const resp = await api.patch(`${base}${paciente.id}/`, payload);
      return resp.data;
    }
  },

  async getReceitas(params = {}) {
    const baseRaw = import.meta.env.VITE_RECEITAS_ENDPOINT || "/receitas/"
    const endpoint = baseRaw.endsWith("/") ? baseRaw : `${baseRaw}/`

    const { __propagateErrors, ...cleanParams } = params || {}
    const queryParams = { ...cleanParams }

    let pacienteId = null
    let temPaciente = false
    try {
      const paciente = await this.getPacienteDoUsuario()
      if (paciente?.id) {
        pacienteId = paciente.id
        // Não usar consulta__paciente por padrão para evitar 500 em alguns backends
        if (!queryParams["paciente"]) queryParams["paciente"] = paciente.id
        if (!queryParams["paciente_id"]) queryParams["paciente_id"] = paciente.id
        temPaciente = true
      }
    } catch (_) {}

    // Evita requisição se não houver paciente e nenhum filtro explícito
    if (!temPaciente && Object.keys(queryParams).length === 0) {
      return { results: [] }
    }

    // Helper para tentar GET e retornar data normalizada
    const tryGet = async (url, params) => {
      try {
        const res = await api.get(url, params ? { params } : undefined)
        const data = res?.data
        const list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : null)
        return { ok: true, data: list != null ? data : { results: [] } }
      } catch (err) {
        const st = err?.response?.status
        // se __propagateErrors e não queremos fallback, relança
        if (__propagateErrors === true && ![400, 404, 405, 500].includes(st)) throw err
        return { ok: false, err }
      }
    }

    // Tenta sequencialmente um conjunto reduzido de endpoints/parametrizações para evitar spam de erros no console
    const attempts = []
    if (pacienteId) {
      // Priorizar variações com query string no endpoint /receitas/
      attempts.push(() => tryGet(endpoint, { paciente: pacienteId }))
      attempts.push(() => tryGet(endpoint, { paciente_id: pacienteId }))
    }
    // Por último, tenta com os queryParams originais (para preservar filtros adicionais),
    // porém removendo explicitamente consulta__paciente se existir
    const sanitizedParams = { ...queryParams }
    delete sanitizedParams["consulta__paciente"]
    attempts.push(() => tryGet(endpoint, sanitizedParams))

    let apiData = null
    for (const fn of attempts) {
      // eslint-disable-next-line no-await-in-loop
      const r = await fn()
      if (r.ok) {
        apiData = r.data
        break
      }
    }

    // Último fallback: busca geral e filtra no cliente
    if (!apiData) {
      const rAll = await tryGet(endpoint)
      if (rAll.ok) {
        apiData = rAll.data
        // manter shape
        const list = Array.isArray(apiData) ? apiData : (Array.isArray(apiData?.results) ? apiData.results : [])
        const filtered = pacienteId
          ? list.filter((x) => String(x.paciente_id || x.paciente || x?.consulta?.paciente || x?.consulta?.paciente_id || "") === String(pacienteId))
          : list
        apiData = Array.isArray(apiData) ? filtered : { results: filtered }
      } else {
        apiData = { results: [] }
      }
    }

    // Mesclar com receitas mock salvas localmente (quando em DEV)
    let local = []
    try {
      const arr = JSON.parse(localStorage.getItem("mock_receitas") || "[]")
      if (Array.isArray(arr)) {
        // Se houver paciente no query, filtra
        const pid = queryParams["consulta__paciente"] || queryParams.paciente || queryParams.paciente_id || pacienteId
        local = pid ? arr.filter((x) => String(x.paciente_id || x.consulta?.paciente_id || "") === String(pid)) : arr
      }
    } catch (_) {}

    // Normalizar para lista
    const list = Array.isArray(apiData) ? apiData : Array.isArray(apiData?.results) ? apiData.results : []

    // Evitar duplicados por id
    const byId = new Map()
    ;[...list, ...local].forEach((r) => {
      if (!r) return
      const k = r.id ?? `${r.created_at}-${r.medicamentos}`
      if (!byId.has(k)) byId.set(k, r)
    })

    const merged = Array.from(byId.values())

    // Normalizar campo de link assinado -> garantir URL ABSOLUTA para funcionar ao abrir em nova aba no DEV
    const normalizeUrl = (u) => {
      if (!u) return u
      // manter URLs absolutas (http/https) e esquemas especiais (data:, blob:)
      if (/^https?:\/\//i.test(u) || /^(data|blob):/i.test(u)) return u
      const origin = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")
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

    // Retornar no mesmo formato (results) esperado pela tela
    return { results: mergedNormalized }
  },

  async getMedicosVinculados() {
    const basePacRaw = import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/"
    const basePac = basePacRaw.endsWith("/") ? basePacRaw : `${basePacRaw}/`
    const paciente = await this.getPacienteDoUsuario()
    if (!paciente?.id) return []
    const res = await api.get(`${basePac}${paciente.id}/medicos/`)
    return Array.isArray(res.data) ? res.data : []
  },

  async solicitarReceita({ medico, mensagem }) {
    const basePacRaw = import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/"
    const basePac = basePacRaw.endsWith("/") ? basePacRaw : `${basePacRaw}/`
    const paciente = await this.getPacienteDoUsuario()
    if (!paciente?.id) throw new Error("Paciente não identificado.")
    const payload = {
      medico,
      ...(mensagem ? { mensagem } : {}),
    }
    const res = await api.post(`${basePac}${paciente.id}/solicitar_receita/`, payload)
    return res.data
  },

  async getMedicos(params = {}) {
    const endpoint = import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/"
    const response = await api.get(endpoint, { params })
    return response.data
  },

  // NOVO: Dashboard do Paciente com fallback inteligente
  async getDashboard() {
    // 1) Se existir endpoint dedicado, usa-o
    const envEndpoint = import.meta.env.VITE_PACIENTE_DASHBOARD_ENDPOINT
    if (envEndpoint) {
      const endpoint = envEndpoint.endsWith("/") ? envEndpoint : `${envEndpoint}/`
      try {
        const res = await api.get(endpoint)
        return res.data
      } catch (err) {
        if (err?.response?.status !== 404) {
          // Se for erro diferente de 404, não tenta fallback cego
          console.warn("[pacienteService] Dashboard dedicado falhou:", err?.response?.status)
        }
        // Continua para o fallback
      }
    }

    // 2) Fallback: compor estatísticas a partir de endpoints existentes
    try {
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

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
        return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()
      }

      // Normalização de consultas
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

      // Normalização de exames
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

  // NOVO: garantir que exista um registro de Paciente para o usuário autenticado
  async garantirPacienteDoUsuario(initialData = {}) {
    // Se já existe, apenas retorna
    try {
      const existente = await this.getPacienteDoUsuario()
      if (existente?.id) return existente
    } catch (_) {}

    const baseRaw = import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/"
    const base = baseRaw.endsWith("/") ? baseRaw : `${baseRaw}/`

    // Limpar payload de undefined
    const payload = { ...initialData }
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k]
    })

    // 1) Tenta criar via /pacientes/me/
    try {
      const resp = await api.post(`${base}me/`, payload)
      return resp.data
    } catch (err) {
      console.debug("[pacienteService] POST /pacientes/me/ falhou:", err?.response?.status)
    }

    // 2) Fallback: POST direto em /pacientes/
    try {
      const resp = await api.post(base, payload)
      // Alguns backends retornam o objeto criado; se não, tenta buscar novamente
      if (resp?.data) return resp.data
    } catch (err2) {
      console.debug("[pacienteService] POST /pacientes/ falhou:", err2?.response?.status)
    }

    // 3) Última tentativa: revalidar existência
    try {
      const criado = await this.getPacienteDoUsuario()
      if (criado?.id) return criado
    } catch (_) {}

    throw new Error("Não foi possível criar o perfil de paciente para o usuário atual.")
  },
}
