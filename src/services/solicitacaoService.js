import api from "./api"
import { authService } from "./authService"

const VERBOSE = String(import.meta.env.VITE_VERBOSE_ENDPOINT_LOGS || "").toLowerCase() === "true"
const DISABLE_PROBING = String(import.meta.env.VITE_DISABLE_ENDPOINT_PROBING || "").toLowerCase() === "true"

export const solicitacaoService = {
  async criarSolicitacaoMedico(data, options = {}) {
    const formData = new FormData()

    // Helper para anexar sinônimos de campo (garante compatibilidade com backends snake_case)
    const appendSyn = (key, value, extraKeys = []) => {
      if (value === undefined || value === null) return
      const keys = [key, ...extraKeys].filter(Boolean)
      for (const k of keys) formData.append(k, value)
    }

    // Campos básicos (duplicando camelCase e snake_case)
    appendSyn("crm", data.crm, ["crm_numero"]) // alguns backends usam crm_numero
    appendSyn("especialidade", data.especialidade)
    appendSyn("instituicaoFormacao", data.instituicaoFormacao, ["instituicao_formacao"]) 
    appendSyn("anoFormacao", data.anoFormacao, ["ano_formacao"]) 
    appendSyn("residencia", data.residencia ?? "")
    appendSyn("instituicaoResidencia", data.instituicaoResidencia ?? "", ["instituicao_residencia"]) 
    appendSyn("anoResidencia", data.anoResidencia ?? "", ["ano_residencia"]) 
    appendSyn("experiencia", data.experiencia)
    appendSyn("motivacao", data.motivacao, ["motivo", "justificativa"]) 

    // Campos extras enriquecidos possivelmente vindos do authService
    appendSyn("nome", data.nome, ["nome_completo"]) 
    appendSyn("email", data.email)
    appendSyn("cpf", data.cpf)
    appendSyn("tipo", data.tipo || "medico")

    // Arquivos (duplicando nomes camelCase e snake_case)
    if (data.documentos?.diplomaMedicina) {
      appendSyn("diplomaMedicina", data.documentos.diplomaMedicina, ["diploma_medicina"]) 
    }
    if (data.documentos?.certificadoResidencia) {
      appendSyn("certificadoResidencia", data.documentos.certificadoResidencia, ["certificado_residencia"]) 
    }
    if (data.documentos?.comprovanteExperiencia) {
      appendSyn("comprovanteExperiencia", data.documentos.comprovanteExperiencia, ["comprovante_experiencia"]) 
    }

    // Identificação do usuário (se o backend não usa request.user)
    let userId
    try {
      const u = authService.getCurrentUser?.()
      userId = u?.id || u?.pk || u?.user?.id
      if (userId) {
        appendSyn("user", userId, ["usuario", "user_id", "usuario_id"]) 
      }
    } catch {}

    // Também preparamos um payload JSON equivalente (sem arquivos) para fallback
    const jsonPayload = {
      crm: data.crm,
      crm_numero: data.crm,
      especialidade: data.especialidade,
      instituicaoFormacao: data.instituicaoFormacao,
      instituicao_formacao: data.instituicaoFormacao,
      anoFormacao: data.anoFormacao,
      ano_formacao: data.anoFormacao,
      residencia: data.residencia ?? "",
      instituicaoResidencia: data.instituicaoResidencia ?? "",
      instituicao_residencia: data.instituicaoResidencia ?? "",
      anoResidencia: data.anoResidencia ?? "",
      ano_residencia: data.anoResidencia ?? "",
      experiencia: data.experiencia,
      motivacao: data.motivacao,
      motivo: data.motivacao,
      justificativa: data.motivacao,
      nome: data.nome,
      nome_completo: data.nome_completo || data.nome,
      email: data.email,
      cpf: data.cpf,
      tipo: data.tipo || "medico",
    }
    if (userId) {
      jsonPayload.user = userId
      jsonPayload.usuario = userId
      jsonPayload.user_id = userId
      jsonPayload.usuario_id = userId
    }

    const configured = (import.meta.env.VITE_SOLICITACOES_MEDICOS_ENDPOINT || "").trim()
    const generic = (import.meta.env.VITE_SOLICITACOES_ENDPOINT || "").trim()

    let baseCandidates = []
    if (configured) baseCandidates.push(configured)
    if (generic) baseCandidates.push(generic)

    if (!DISABLE_PROBING) {
      baseCandidates.push(
        "/medicos/solicitacoes/",
        "/solicitacoes/medicos/",
        "/solicitacoes/medico/",
        "/medico/solicitacoes/",
        "/medicos/solicitacao/",
        "/solicitacao/medicos/",
        "/users/medicos/solicitacoes/",
        "/usuarios/medicos/solicitacoes/",
        "/users/solicitacoes/medico/",
        "/usuarios/solicitacoes/medico/",
        // Complementos específicos para cenários comuns
        "/app_medico/",
        "/meu_app_medico/",
        "/meui_app_solicitacaomedico/",
        "/solicitacaomedico/",
        "/solicitacao-medico/",
        "/solicitacoes/solicitacao-medico/",
        "/solicitacoes/solicitacaomedico/"
      )
    }

    const variants = (p) => {
      if (DISABLE_PROBING) return [p]
      const slash = p.endsWith("/") ? "" : "/"
      return [
        p,
        `${p}${slash}criar/`,
        `${p}${slash}create/`,
        `${p}${slash}novo/`,
        `${p}${slash}nova/`,
        `${p}${slash}add/`,
        `${p}${slash}adicionar/`,
        `${p}${slash}registrar/`,
        `${p}${slash}enviar/`,
        `${p}${slash}submit/`,
      ]
    }
    const candidates = Array.from(new Set(baseCandidates.flatMap(variants)))

    const tried = []
    let lastErr
    for (const url of candidates) {
      try {
        tried.push(url)
        if (VERBOSE) console.debug("[solicitacaoService] Tentando endpoint:", url)
        const res = await api.post(url, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          signal: options?.signal,
        })
        return res.data
      } catch (err) {
        const status = err?.response?.status
        // Se o backend rejeitar multipart, tenta JSON como fallback
        const bodyText = (err?.response?.data && JSON.stringify(err.response.data)) || ""
        const mustTryJson = status === 415 || (status === 400 && /JSON|application\/json|parse/i.test(bodyText))
        if (mustTryJson) {
          try {
            const resJson = await api.post(url, jsonPayload, {
              headers: { "Content-Type": "application/json" },
              signal: options?.signal,
            })
            return resJson.data
          } catch (jsonErr) {
            // se 404/405, seguimos tentando outras variações; senão, propaga erro JSON
            const st2 = jsonErr?.response?.status
            if ((st2 === 404 || st2 === 405) && !DISABLE_PROBING) {
              lastErr = jsonErr
              continue
            }
            throw jsonErr
          }
        }

        if ((status === 404 || status === 405) && !DISABLE_PROBING) {
          if (VERBOSE) console.debug("[solicitacaoService] Endpoint não aceitou método (", status, "):", url)
          lastErr = err
          continue
        }
        throw err
      }
    }

    if (lastErr) {
      if (VERBOSE) {
        console.warn(
          "[solicitacaoService] Nenhum endpoint aceitou POST. Último status:",
          lastErr?.response?.status,
          "URLs tentadas:",
          tried
        )
      }
      throw lastErr
    }
    throw new Error(
      "Nenhum endpoint de criação aceitou a solicitação. Configure VITE_SOLICITACOES_MEDICOS_ENDPOINT. URLs tentadas: " +
        tried.join(", ")
    )
  },

  async listarMinhasSolicitacoes(params = {}, options = {}) {
    const env = (import.meta.env.VITE_SOLICITACOES_MEDICOS_ENDPOINT || "").trim()
    const generic = (import.meta.env.VITE_SOLICITACOES_ENDPOINT || "").trim()

    const candidates = []
    if (env) candidates.push(env)
    if (generic) candidates.push(generic)
    if (!DISABLE_PROBING) {
      candidates.push(
        "/medicos/solicitacoes/",
        "/solicitacoes/medicos/",
        "/medico/solicitacoes/",
        "/me/solicitacoes/",
        "/minhas-solicitacoes/",
        "/solicitacoes/me/",
        "/solicitacoes/minhas/"
      )
    }

    const normalizedParams = { ...params }
    if (normalizedParams.limit != null && normalizedParams.page_size == null) normalizedParams.page_size = normalizedParams.limit
    if (normalizedParams.page_size != null && normalizedParams.limit == null) normalizedParams.limit = normalizedParams.page_size

    let lastErr
    for (const raw of candidates) {
      const endpoint = ensureTrailingSlash(raw)
      try {
        const res = await api.get(endpoint, { params: normalizedParams, signal: options?.signal })
        if (Array.isArray(res.data?.results)) {
          return {
            ...res.data,
            results: res.data.results.map(normalizeSolicitacaoItem),
          }
        }
        if (Array.isArray(res.data)) {
          return { results: res.data.map(normalizeSolicitacaoItem) }
        }
        return res.data
      } catch (err) {
        if (err?.response?.status === 404 && !DISABLE_PROBING) continue
        throw err
      }
    }

    return { results: [] }
  },

  async getSolicitacaoMedico(id, options = {}) {
    const env = (import.meta.env.VITE_SOLICITACOES_MEDICOS_ENDPOINT || "").trim()
    const generic = (import.meta.env.VITE_SOLICITACOES_ENDPOINT || "").trim()
    const candidates = []
    if (env) candidates.push(env)
    if (generic) candidates.push(generic)
    if (!DISABLE_PROBING) {
      candidates.push(
        "/medicos/solicitacoes/",
        "/solicitacoes/medicos/",
        "/medico/solicitacoes/",
      )
    }
    let lastErr
    for (const raw of candidates) {
      const endpoint = ensureTrailingSlash(raw) + String(id) + "/"
      try {
        const res = await api.get(endpoint, { signal: options?.signal })
        return normalizeSolicitacaoItem(res.data)
      } catch (err) {
        if (err?.response?.status === 404 && !DISABLE_PROBING) { lastErr = err; continue }
        throw err
      }
    }
    if (lastErr) throw lastErr
    throw new Error("Solicitação não encontrada")
  },
}

function ensureTrailingSlash(path) {
  if (!path) return "/"
  return path.endsWith("/") ? path : path + "/"
}

function normalizeSolicitacaoItem(it = {}) {
  const id = it.id || it.pk
  return {
    id,
    crm: it.crm || it.crm_numero,
    especialidade: it.especialidade,
    instituicaoFormacao: it.instituicaoFormacao || it.instituicao_formacao,
    anoFormacao: it.anoFormacao || it.ano_formacao,
    residencia: it.residencia,
    instituicaoResidencia: it.instituicaoResidencia || it.instituicao_residencia,
    anoResidencia: it.anoResidencia || it.ano_residencia,
    experiencia: it.experiencia,
    motivacao: it.motivacao || it.motivo || it.justificativa,
    nome: it.nome || it.nome_completo,
    email: it.email,
    cpf: it.cpf,
    status: it.status || it.situacao || it.aprovado,
    created_at: it.created_at || it.data_criacao,
  }
}