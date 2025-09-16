import api from "./api"
import { solicitacaoService } from "./solicitacaoService"
import { authService } from "./authService"

const STRICT = String(import.meta.env.VITE_DISABLE_ENDPOINT_PROBING ?? "true").toLowerCase() !== "false"
const VERBOSE = String(import.meta.env.VITE_VERBOSE_ENDPOINT_LOGS ?? "false").toLowerCase() === "true"

export const adminService = {
  async getDashboard() {
    const response = await api.get("/admin/dashboard/")
    return response.data
  },

  async getSolicitacoes(params = {}, options = {}) {
    const bases = getBaseCandidates()
    const normalized = sanitizeListParams(normalizeParams(params))

    let lastErr
    for (const base of bases) {
      const baseUrl = ensureTrailingSlash(base)
      const endpointsToTry = STRICT ? [baseUrl] : [baseUrl, baseUrl + "listar/", baseUrl + "list/", baseUrl + "todas/", baseUrl + "all/"]

      const paramVariants = []
      paramVariants.push(normalized)
      if (!STRICT && normalized?.ordering) {
        const { ordering, ...rest } = normalized
        paramVariants.push(rest)
      }
      if (!STRICT) {
        const pageOnly = {}
        if (normalized.page_size != null) pageOnly.page_size = normalized.page_size
        if (normalized.limit != null) pageOnly.limit = normalized.limit
        if (normalized.page != null) pageOnly.page = normalized.page
        if (normalized.offset != null) pageOnly.offset = normalized.offset
        if (Object.keys(pageOnly).length) paramVariants.push(pageOnly)
      }
      if (Object.keys(normalized).length) paramVariants.push({})

      for (const endpoint of endpointsToTry) {
        for (const p of paramVariants) {
          try {
            if (VERBOSE) console.debug("[adminService.getSolicitacoes] GET", endpoint, p)
            const response = await api.get(endpoint, { params: p, signal: options?.signal })
            const data = response.data
            const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
            if (VERBOSE) console.debug("[adminService.getSolicitacoes] OK", endpoint, `items=${list.length}`)
            return list.map(normalizeSolicitacaoItem)
          } catch (err) {
            const st = err?.response?.status
            if (VERBOSE) console.warn("[adminService.getSolicitacoes] Falhou", endpoint, "status=", st, "params=", p)
            // Autenticação/autorização deve interromper o fluxo
            if (st === 401 || st === 403) { throw err }
            // Para 404/405/500/400/422 e quaisquer outros, seguimos tentando próximos endpoints
            lastErr = err
            continue
          }
        }
      }
      continue
    }

    // Se nenhum endpoint válido respondeu, não tentar fallbacks ruidosos (evita vários 404/500 no console)
    if (!VERBOSE && import.meta.env.DEV) {
      console.info("[adminService.getSolicitacoes] Nenhum endpoint respondeu. Retornando lista vazia.")
    }
    return []
  },

  async getSolicitacao(id) {
    const bases = getBaseCandidates()
    let lastErr
    for (const base of bases) {
      const endpoint = ensureTrailingSlash(base) + `${id}/`
      try {
        const response = await api.get(endpoint)
        return normalizeSolicitacaoDetail(response.data || {})
      } catch (err) {
        const st = err?.response?.status
        if (VERBOSE) console.warn("[adminService.getSolicitacao] Falhou", endpoint, "status=", st)
        // Interromper apenas se for autenticação/autorização
        if (st === 401 || st === 403) { throw err }
        // Para demais erros (404/405/500/400/422 etc.), continuar tentando próximas bases
        lastErr = err
        continue
      }
    }
    throw lastErr || new Error("Nenhum endpoint para detalhe de solicitação foi encontrado.")
  },

  async aprovarSolicitacao(id, observacoes = "") {
    const bases = getBaseCandidates()
    let lastErr

    for (const base of bases) {
      const baseUrl = ensureTrailingSlash(base)
      const variants = [
        { method: "post", url: `${baseUrl}${id}/aprovar/`, body: { observacoes } },
        { method: "post", url: `${baseUrl}${id}/approve/`, body: { notes: observacoes } },
        { method: "post", url: `${baseUrl}${id}/aprovacao/`, body: { observacoes } },
        { method: "post", url: `${baseUrl}${id}/status/`, body: { status: "approved", observacoes } },
        { method: "patch", url: `${baseUrl}${id}/`, body: { status: "approved", observacoes } },
        { method: "put", url: `${baseUrl}${id}/`, body: { status: "approved", observacoes } },
      ]

      for (const v of variants) {
        try {
          if (VERBOSE) console.debug("[adminService.aprovarSolicitacao]", v.method.toUpperCase(), v.url, v.body)
          const response = await api[v.method](v.url, v.body)

          ;(async () => {
            try {
              await adminService.registrarAuditoria({
                action: "approve",
                entity: "SolicitacaoMedico",
                entity_id: id,
                status: "success",
                metadata: { observacoes },
              })
            } catch (e) {
              if (VERBOSE) console.warn("[adminService.aprovarSolicitacao] auditoria falhou:", e?.response?.status)
            }
          })()

          return response.data
        } catch (err) {
          const st = err?.response?.status
          if (VERBOSE) console.warn("[adminService.aprovarSolicitacao] Falhou", v.url, "status=", st)
          // Parar apenas para 401/403
          if (st === 401 || st === 403) { throw err }
          // Para outros erros, tentar próxima variante/base
          lastErr = err
          continue
        }
      }
    }

  },

  async rejeitarSolicitacao(id, motivo) {
    const bases = getBaseCandidates()
    let lastErr
    for (const base of bases) {
      const baseUrl = ensureTrailingSlash(base)
      const variants = [
        { method: "post", url: `${baseUrl}${id}/rejeitar/`, body: { motivo } },
        { method: "post", url: `${baseUrl}${id}/reject/`, body: { reason: motivo } },
        { method: "post", url: `${baseUrl}${id}/status/`, body: { status: "rejected", motivo } },
        { method: "patch", url: `${baseUrl}${id}/`, body: { status: "rejected", motivo } },
        { method: "put", url: `${baseUrl}${id}/`, body: { status: "rejected", motivo } },
      ]

      for (const v of variants) {
        try {
          if (VERBOSE) console.debug("[adminService.rejeitarSolicitacao]", v.method.toUpperCase(), v.url, v.body)
          const response = await api[v.method](v.url, v.body)

          ;(async () => {
            try {
              await adminService.registrarAuditoria({
                action: "reject",
                entity: "SolicitacaoMedico",
                entity_id: id,
                status: "success",
                metadata: { motivo },
              })
            } catch (e) {
              if (VERBOSE) console.warn("[adminService.rejeitarSolicitacao] auditoria falhou:", e?.response?.status)
            }
          })()

          return response.data
        } catch (err) {
          const st = err?.response?.status
          if (VERBOSE) console.warn("[adminService.rejeitarSolicitacao] Falhou", v.url, "status=", st)
          // Parar apenas para 401/403
          if (st === 401 || st === 403) { throw err }
          // Para outros erros, tentar próxima variante/base
          lastErr = err
          continue
        }
      }
    }

  },

  async getAuditoria(params = {}) {
    const response = await api.get("/admin/auditoria/", { params })
    return response.data
  },

  async registrarAuditoria(entry = {}) {
    const actor = await authService.getCurrentUser()

    // Mapear para os campos esperados pelo backend
    const action = entry.action || entry.acao || entry.type
    const entity = entry.entity || entry.entidade || ""
    const entity_id = entry.entity_id || entry.id || entry.solicitacao_id || entry.target_id || ""
    const status = entry.status || "success"

    const metaBase = typeof entry.metadata === "object" && entry.metadata !== null ? entry.metadata : {}
    const detalhes = typeof entry.detalhes === "object" && entry.detalhes !== null ? entry.detalhes : {}

    const metadata = {
      ...metaBase,
      ...detalhes,
      actor: actor?.id || actor?.username || "system",
      source: "frontend",
    }

    const payload = {
      action,
      entity,
      entity_id,
      status,
      metadata,
    }

    try {
      await api.post("/admin/auditoria/", payload)
    } catch (e) {
      if (VERBOSE) console.warn("[adminService.registrarAuditoria] falhou:", e?.response?.status)
    }
  },

  async getUsuarios(params = {}) {
    const response = await api.get("/admin/usuarios/", { params })
    const data = response.data
    return Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
  },

  async getClinicas(params = {}) {
    const response = await api.get("/admin/clinicas/", { params })
    const data = response.data
    return Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
  },

  async updateUsuario(id, payload = {}) {
    const response = await api.patch(`/admin/usuarios/${id}/`, payload)
    return response.data
  },

  async removerUsuariosEmMassa(ids = []) {
    const response = await api.post("/admin/usuarios/remover/", { ids })
    return response.data
  },

  async createUsuario(payload = {}) {
    const response = await api.post("/admin/usuarios/", payload)
    return response.data
  },
}

function ensureTrailingSlash(path) {
  if (!path) return "/"
  const s = String(path)
  return s.endsWith("/") ? s : s + "/"
}

function normalizeParams(params = {}) {
  const p = { ...params }
  if (p.limit != null && p.page_size == null) p.page_size = p.limit
  if (p.page_size != null && p.limit == null) p.limit = p.page_size
  Object.keys(p).forEach((k) => {
    if (p[k] === undefined || p[k] === null || p[k] === "") delete p[k]
  })
  return p
}

function sanitizeListParams(params = {}) {
  // adiciona filtros usados no backend: clinica e especialidade
  const allowed = new Set([
    "status",
    "ordering",
    "search",
    "limit",
    "page",
    "page_size",
    "offset",
    "clinica",
    "especialidade",
  ])
  const out = {}
  for (const [k, v] of Object.entries(params || {})) {
    if (!allowed.has(k)) continue
    out[k] = v
  }
  return out
}

function getBaseCandidates() {
  const envMed = (import.meta.env.VITE_SOLICITACOES_MEDICOS_ENDPOINT || "").trim()
  const envAdmin = (import.meta.env.VITE_ADMIN_SOLICITACOES_ENDPOINT || "").trim()
  const envGeneric = (import.meta.env.VITE_SOLICITACOES_ENDPOINT || "").trim()
  const envs = Array.from(new Set([envMed, envAdmin, envGeneric].filter(Boolean)))

  // Preferir o ViewSet real de solicitações baseado no modelo
  const preferred = [
    "/solicitacaomedico/", // novo endpoint com approve/reject e auditoria
    "/admin/solicitacoes/", // manter como fallback
  ]

  const others = [
    "/medicos/solicitacoes/", // ViewSet que lista Médicos com status
    "/solicitacoes/medicos/", // alias
  ]

  const candidates = Array.from(new Set([...preferred, ...envs, ...others].filter(Boolean)))
  return candidates
}

function normalizeSolicitacaoItem(it = {}) {
  return {
    id: it.id || it.pk || it.uuid || it.codigo || it.codigo_id || 0,
    tipo: String(it.tipo || it.type || it.kind || "medico").toLowerCase(),
    nome: it.nome || it.name || it.usuario?.nome || it.user?.name || it.medico?.nome || it.clinica?.nome || "—",
    email: it.email || it.usuario?.email || it.user?.email || it.medico?.user?.email || it.clinica?.email || "—",
    telefone:
      it.telefone ||
      it.phone ||
      it.celular ||
      it.usuario?.telefone ||
      it.user?.telefone ||
      it.medico?.telefone ||
      it.medico?.contato?.telefone ||
      it.medico?.user?.telefone ||
      it.clinica?.telefone ||
      "",
    crm: it.crm || it.medico?.crm || it.crm_numero || "",
    cnpj: it.cnpj || it.clinica?.cnpj || "",
    responsavel: it.responsavel || it.responsavel_tecnico || it.clinica?.responsavel || "",
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
        reprovado: "rejected",
        reprovada: "rejected",
      }
      return map[raw] || raw
    })(),
    dataEnvio:
      it.dataEnvio || it.created_at || it.createdAt || it.data_criacao || it.submitted_at || new Date().toISOString(),
    // Novos campos vindos do backend para exibir na lista
    dataAprovacao: it.dataAprovacao || it.aprovado_em || it.data_aprovacao || it.approved_at || null,
    dataRejeicao: it.dataRejeicao || it.rejeitado_em || it.data_rejeicao || it.rejected_at || null,
    documentos: Array.isArray(it.documentos) ? it.documentos : it.documents || [],
    urgencia: String(it.urgencia || it.priority || "normal").toLowerCase(),
    observacoes: it.observacoes || it.notes || it.comentarios || "",
    aprovadoPor: it.aprovadoPor || it.approved_by || "",
    rejeitadoPor: it.rejeitadoPor || it.rejected_by || "",
    motivoRejeicao: it.motivoRejeicao || it.motivo || it.reason || "",
    especialidade:
      it.especialidade ||
      it.especialidade_nome ||
      it.medico?.especialidade?.nome ||
      it.medico?.especialidade ||
      "",
  }
}

function normalizeSolicitacaoDetail(it = {}) {
  const base = normalizeSolicitacaoItem(it)

  const dataAprovacao =
    it.dataAprovacao || it.aprovado_em || it.data_aprovacao || it.approved_at || it.dataAprovado || null
  const dataRejeicao =
    it.dataRejeicao || it.rejeitado_em || it.data_rejeicao || it.rejected_at || it.dataRejeitado || null

  // Coleta bruta de documentos a partir de múltiplas fontes
  const collected = []
  const addDocs = (value) => {
    if (!value) return
    if (Array.isArray(value)) {
      collected.push(...value.filter(Boolean))
    } else if (typeof value === "object") {
      collected.push(...Object.values(value).filter(Boolean))
    } else if (typeof value === "string") {
      collected.push(value)
    }
  }

  addDocs(it.documentos)
  addDocs(it.docs)
  addDocs(it.arquivos)
  addDocs(it.attachments)
  addDocs(it.files)

  // Também considerar chaves conhecidas no topo do objeto
  const knownTopLevel = [
    it.diplomaMedicina,
    it.certificadoResidencia,
    it.comprovanteExperiencia,
    it.documento_identidade,
    it.comprovante_endereco,
    it.diploma_medicina,
    it.certificado_residencia,
    it.comprovante_experiencia,
    it.rg,
    it.cpf,
  ].filter(Boolean)
  collected.push(...knownTopLevel)

  // Normalização de documentos para o formato { nome, tamanho, dataUpload, url }
  const mapDocumento = (d) => {
    if (!d) return null
    if (typeof d === "string") {
      const nome = (d.split("/").pop() || "Documento").trim()
      return {
        nome,
        tamanho: "",
        dataUpload:
          it.dataEnvio || it.created_at || it.createdAt || it.submitted_at || new Date().toISOString(),
        url: d,
      }
    }
    const nome = d.nome || d.name || d.filename || d.file_name || d.titulo || d.tipo || "Documento"
    const tamanho = d.tamanho || d.size || d.file_size || ""
    const dataUpload =
      d.dataUpload || d.data_upload || d.uploaded_at || d.created_at || base.dataEnvio || new Date().toISOString()
    const url = d.url || d.link || d.path || d.file || d.arquivo || d.location || ""
    return { nome, tamanho, dataUpload, url }
  }

  const documentos = collected.map(mapDocumento).filter(Boolean)

  // Endereço (objeto ou string)
  const eSrc = it.endereco || it.medico?.endereco || it.clinica?.endereco || {}
  const endereco =
    typeof eSrc === "string"
      ? {
          cep: it.cep || "",
          logradouro: eSrc,
          bairro: "",
          cidade: "",
          estado: "",
        }
      : {
          cep: eSrc.cep || it.cep || "",
          logradouro: eSrc.logradouro || eSrc.rua || eSrc.endereco || "",
          bairro: eSrc.bairro || "",
          cidade: eSrc.cidade || eSrc.municipio || "",
          estado: eSrc.estado || eSrc.uf || "",
        }

  // Formação / Experiência / Motivação
  const instituicaoFormacao =
    it.instituicaoFormacao || it.instituicao_formacao || it.formacao?.instituicao || it.medico?.formacao?.instituicao || ""
  const anoFormacao = it.anoFormacao || it.ano_formacao || it.formacao?.ano || it.medico?.formacao?.ano || ""
  const residencia = it.residencia || it.formacao?.residencia?.nome || it.medico?.residencia?.nome || ""
  const instituicaoResidencia =
    it.instituicaoResidencia || it.instituicao_residencia || it.formacao?.residencia?.instituicao || it.medico?.residencia?.instituicao || ""
  const anoResidencia = it.anoResidencia || it.ano_residencia || it.formacao?.residencia?.ano || it.medico?.residencia?.ano || ""
  const experiencia = it.experiencia || it.experiencias || it.medico?.experiencia || ""
  const motivacao = it.motivacao || it.motivo || it.justificativa || it.reason || ""

  return {
    ...base,
    dataAprovacao,
    dataRejeicao,
    documentos: documentos.length ? documentos : base.documentos,
    endereco,
    instituicaoFormacao,
    anoFormacao,
    residencia,
    instituicaoResidencia,
    anoResidencia,
    experiencia,
    motivacao,
  }
}
