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

    // 3) Se tem usuário, procurar o Médico correspondente
    if (user?.id) {
      // Tentar com múltiplas chaves de filtro
      const keysRaw = (import.meta.env.VITE_MEDICOS_USER_FILTER_KEYS || "user,user__id,user_id,usuario,usuario_id")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      for (const key of keysRaw) {
        try {
          const res = await api.get(medBase, { params: { [key]: user.id } })
          const items = Array.isArray(res.data?.results) ? res.data.results : res.data
          if (items?.[0]) return items[0]
        } catch {}
      }
      return { user }
    }

    // 4) Fallback final: retorna o usuário local se houver
    return localUser ? { user: localUser } : null
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

    // Tenta endpoint dedicado /medicos/{id}/consultas_hoje/
    if (mid) {
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
    const baseRaw = import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/"
    const base = baseRaw.endsWith("/") ? baseRaw : `${baseRaw}/`
    const url = `${base}${consultaId}/iniciar/`
    const res = await api.post(url)
    return res.data
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

  // NOVO: criar receita vinculada à consulta
  async criarReceita(payload) {
    // payload: { consulta_id, medicamentos, posologia, validade, observacoes? }
    const endpoint = import.meta.env.VITE_RECEITAS_ENDPOINT || "/receitas/"
    const { data } = await api.post(endpoint, payload)
    return data
  },

  // NOVO: enviar dados para sumarização/IA após finalizar a consulta
  async sumarizarConsulta(consultaId, payload = {}) {
    if (!consultaId) throw new Error("consultaId é obrigatório")
    const baseRaw = import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/"
    const base = baseRaw.endsWith("/") ? baseRaw : `${baseRaw}/`
    const url = `${base}${consultaId}/sumarizar/`
    const { data } = await api.post(url, payload)
    return data
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

  // Exemplo de vincular secretaria
  async vincularSecretaria(secretariaId) {
    const endpoint = import.meta.env.VITE_SECRETARIAS_ENDPOINT || "/secretarias/"
    const res = await api.post(`${endpoint}${secretariaId}/vincular/`)
    return res.data
  },
}
