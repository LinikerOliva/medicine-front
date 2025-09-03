import api from "./api"

export const solicitacaoService = {
  async criarSolicitacaoMedico(data) {
    const formData = new FormData()
    formData.append("crm", data.crm)
    formData.append("especialidade", data.especialidade)
    formData.append("instituicaoFormacao", data.instituicaoFormacao)
    formData.append("anoFormacao", data.anoFormacao)
    formData.append("residencia", data.residencia || "")
    formData.append("instituicaoResidencia", data.instituicaoResidencia || "")
    formData.append("anoResidencia", data.anoResidencia || "")
    formData.append("experiencia", data.experiencia)
    formData.append("motivacao", data.motivacao)
    if (data.documentos?.diplomaMedicina) formData.append("diplomaMedicina", data.documentos.diplomaMedicina)
    if (data.documentos?.certificadoResidencia) formData.append("certificadoResidencia", data.documentos.certificadoResidencia)
    if (data.documentos?.comprovanteExperiencia) formData.append("comprovanteExperiencia", data.documentos.comprovanteExperiencia)

    const configured = (import.meta.env.VITE_SOLICITACOES_MEDICOS_ENDPOINT || "").trim()
    const generic = (import.meta.env.VITE_SOLICITACOES_ENDPOINT || "").trim()

    // Tenta o configurado, o genérico e padrões conhecidos
    const baseCandidates = [
      configured,
      generic,
      "/medicos/solicitacoes/",
      "/solicitacoes/medicos/",
      "/solicitacoes/medico/",
    ].filter(Boolean)

    // Para cada base, tenta também /criar/ e /create/
    const variants = (p) => {
      const slash = p.endsWith("/") ? "" : "/"
      return [p, `${p}${slash}criar/`, `${p}${slash}create/`]
    }
    const candidates = Array.from(new Set(baseCandidates.flatMap(variants)))

    let lastErr
    for (const url of candidates) {
      try {
        console.debug("[solicitacaoService] Tentando endpoint:", url)
        const res = await api.post(url, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        return res.data
      } catch (err) {
        const status = err?.response?.status
        // Em 404/405, tenta a próxima variação/endpoint
        if (status === 404 || status === 405) {
          console.debug("[solicitacaoService] Endpoint não aceitou método (", status, "):", url)
          lastErr = err
          continue
        }
        // Outros erros (400, 401, 500, etc.) param a tentativa
        throw err
      }
    }

    if (lastErr) {
      console.warn("[solicitacaoService] Nenhum endpoint aceitou POST. Último status:", lastErr?.response?.status)
      throw lastErr
    }
    throw new Error("Nenhum endpoint de criação aceitou a solicitação. Configure VITE_SOLICITACOES_MEDICOS_ENDPOINT.")
  },

  // NOVO: lista as solicitações do usuário autenticado
  async listarMinhasSolicitacoes(params = {}) {
    const candidates = []
    const env = (import.meta.env.VITE_SOLICITACOES_MEDICOS_ENDPOINT || "").trim()
    const generic = (import.meta.env.VITE_SOLICITACOES_ENDPOINT || "").trim()

    if (env) candidates.push(env)
    if (generic) candidates.push(generic)
    candidates.push("/medicos/solicitacoes/")
    candidates.push("/solicitacoes/medicos/")

    const normalizedParams = { ...params }
    if (normalizedParams.limit != null && normalizedParams.page_size == null) normalizedParams.page_size = normalizedParams.limit
    if (normalizedParams.page_size != null && normalizedParams.limit == null) normalizedParams.limit = normalizedParams.page_size

    let lastErr
    for (const raw of candidates) {
      const endpoint = ensureTrailingSlash(raw)
      try {
        const res = await api.get(endpoint, { params: normalizedParams })
        const data = res.data
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
          lastErr = err
          continue
        }
        throw err
      }
    }
    throw lastErr || new Error("Nenhum endpoint válido para listar solicitações do médico encontrado.")
  },

  // NOVO: obtém uma solicitação específica do usuário/admin-aware (se o backend permitir)
  async getSolicitacaoMedico(id) {
    const candidates = []
    const env = (import.meta.env.VITE_SOLICITACOES_MEDICOS_ENDPOINT || "").trim()
    const generic = (import.meta.env.VITE_SOLICITACOES_ENDPOINT || "").trim()

    if (env) candidates.push(env)
    if (generic) candidates.push(generic)
    candidates.push("/medicos/solicitacoes/")
    candidates.push("/solicitacoes/medicos/")

    let lastErr
    for (const raw of candidates) {
      const endpoint = ensureTrailingSlash(raw) + `${id}/`
      try {
        const res = await api.get(endpoint)
        return normalizeSolicitacaoItem(res.data || {})
      } catch (err) {
        if (err?.response?.status === 404) {
          lastErr = err
          continue
        }
        throw err
      }
    }
    throw lastErr || new Error("Nenhum endpoint válido para obter a solicitação do médico encontrado.")
  },
}

// Helpers locais
function ensureTrailingSlash(path) {
  if (!path) return path
  return path.endsWith("/") ? path : `${path}/`
}

function normalizeSolicitacaoItem(it = {}) {
  return {
    id: it.id || it.pk || it.uuid || it.codigo || it.codigo_id || 0,
    tipo: String(it.tipo || it.type || it.kind || "medico").toLowerCase(),
    nome: it.nome || it.name || it.usuario?.nome || it.user?.name || "—",
    email: it.email || it.usuario?.email || it.user?.email || "—",
    crm: it.crm || it.crm_numero || "",
    status: it.status || it.situacao || it.state || "pending",
    dataEnvio:
      it.dataEnvio || it.created_at || it.createdAt || it.data_criacao || it.submitted_at || new Date().toISOString(),
    documentos: Array.isArray(it.documentos) ? it.documentos : it.documents || [],
    urgencia: String(it.urgencia || it.priority || "normal").toLowerCase(),
    especialidade: it.especialidade || "",
  }
}