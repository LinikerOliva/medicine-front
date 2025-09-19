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

  // NOVO: finalizar uma consulta (action do backend)
  async finalizarConsulta(consultaId) {
    if (!consultaId) throw new Error("consultaId é obrigatório")
    const baseRaw = import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/"
    const base = baseRaw.endsWith("/") ? baseRaw : `${baseRaw}/`
    const url = `${base}${consultaId}/finalizar/`
    const res = await api.post(url)
    return res.data
  },

  // Criar prontuário (via consulta_id write-only no serializer)
  async criarProntuario(payload) {
    // payload esperado: { consulta_id, queixa_principal, historia_doenca_atual, diagnostico_principal, conduta, ... }
    const endpoint = import.meta.env.VITE_PRONTUARIOS_ENDPOINT || "/prontuarios/"
    const { data } = await api.post(endpoint, payload)
    return data
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
    if (!email) throw new Error("email do paciente é obrigatório para envio")

    // Monta FormData (preferimos multipart para suportar arquivo quando presente)
    const formData = new FormData()
    if (file) {
      const fname = filename || (file.name || "receita.pdf")
      formData.append("file", file, fname)
      formData.append("pdf", file, fname)
      formData.append("documento", file, fname)
    }
    if (email) formData.append("email", email)
    if (formato) formData.append("formato", formato)
    if (receitaId) {
      formData.append("receita", receitaId)
      formData.append("receita_id", receitaId)
    }
    if (pacienteId) {
      formData.append("paciente", pacienteId)
      formData.append("paciente_id", pacienteId)
    }
    // Sugere ao backend assinar caso ele faça isso server-side
    formData.append("assinar", "true")

    // Candidatos de endpoints
    const candidates = []
    const envSend = (import.meta.env.VITE_ENVIAR_RECEITA_ENDPOINT || "").trim()
    if (envSend) candidates.push(envSend)

    const baseReceitas = (import.meta.env.VITE_RECEITAS_ENDPOINT || "/receitas/").replace(/\/?$/, "/")
    const basePacientes = (import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/").replace(/\/?$/, "/")

    if (receitaId) {
      candidates.push(`${baseReceitas}${receitaId}/enviar/`)
      candidates.push(`${baseReceitas}${receitaId}/enviar-email/`)
      candidates.push(`${baseReceitas}${receitaId}/enviar_email/`)
      candidates.push(`${baseReceitas}${receitaId}/email/`)
    }
    candidates.push(`${baseReceitas}enviar/`)
    candidates.push(`${baseReceitas}enviar-email/`)
    candidates.push(`${baseReceitas}enviar_email/`)
    candidates.push(`/email/receitas/`)
    candidates.push(`/receitas/email/`)

    if (pacienteId) {
      candidates.push(`${basePacientes}${pacienteId}/receitas/enviar/`)
      candidates.push(`${basePacientes}${pacienteId}/receitas/email/`)
    }

    let lastErr = null
    for (const raw of candidates) {
      if (!raw) continue
      const url = raw.endsWith("/") ? raw : `${raw}/`
      const methods = ["post", "put"]
      for (const m of methods) {
        try {
          const { data } = await api[m](url, formData)
          return data
        } catch (e) {
          const st = e?.response?.status
          if (st === 404) {
            lastErr = e; break
          }
          if (st === 405) { lastErr = e; continue }
          if (st === 401) throw e
          if (st && [400, 422].includes(st)) throw e
          lastErr = e; break
        }
      }
    }
    if (lastErr) throw lastErr
    throw new Error("Falha ao enviar receita: nenhum endpoint compatível para envio encontrado.")
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

    const candidates = []
    const envSign = (import.meta.env.VITE_MEDICO_ASSINATURA_ENDPOINT || "").trim()
    if (envSign) candidates.push(envSign)

    const medBaseRaw = import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/"
    const medBase = medBaseRaw.endsWith("/") ? medBaseRaw : `${medBaseRaw}/`

    // Rotas comuns
    candidates.push(`${medBase}me/assinar/`)
    candidates.push(`${medBase}assinar/`)
    candidates.push(`/assinatura/assinar/`)
    candidates.push(`/medico/assinar/`)

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