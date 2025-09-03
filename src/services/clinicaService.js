import api from "./api"

export const clinicaService = {
  // Dashboard
  async getDashboard() {
    const candidates = []
    if (import.meta.env.VITE_CLINICA_DASHBOARD_ENDPOINT) {
      candidates.push(import.meta.env.VITE_CLINICA_DASHBOARD_ENDPOINT)
    }
    // Apenas o endpoint correto
    candidates.push("/clinicas/dashboard/")

    let lastError
    for (const raw of candidates) {
      const endpoint = raw.endsWith("/") ? raw : `${raw}/`
      try {
        console.debug("[clinicaService] GET", endpoint)
        const res = await api.get(endpoint)
        return res.data
      } catch (err) {
        if (err?.response?.status === 404) {
          lastError = err
          continue
        }
        throw err
      }
    }
    throw lastError || new Error("Endpoint de dashboard da clínica não encontrado.")
  },

  // Calendário
  getCalendario: (mes, ano) => api.get(`/clinica/calendario/?mes=${mes}&ano=${ano}`),
  getExamesPorData: (data) => api.get(`/clinica/exames/?data=${data}`),

  // Disponibilidade
  getDisponibilidade: (data) => api.get(`/clinica/disponibilidade/?data=${data}`),
  setDisponibilidade: (data, horarios) => api.post("/clinica/disponibilidade/", { data, horarios }),
  updateDisponibilidade: (id, dados) => api.put(`/clinica/disponibilidade/${id}/`, dados),
  deleteDisponibilidade: (id) => api.delete(`/clinica/disponibilidade/${id}/`),

  // Exames
  getExames: (filtros = {}) => api.get("/clinica/exames/", { params: filtros }),
  createExame: (dados) => api.post("/clinica/exames/", dados),
  updateExame: (id, dados) => api.put(`/clinica/exames/${id}/`, dados),
  deleteExame: (id) => api.delete(`/clinica/exames/${id}/`),

  // Tipos de exame
  getTiposExame: () => api.get("/clinica/tipos-exame/"),

  // Relatórios
  getRelatorios: (periodo) => api.get(`/clinica/relatorios/?periodo=${periodo}`),

  // Pacientes
  getPacientes: () => api.get("/clinica/pacientes/"),

  // Médicos
  getMedicos: () => api.get("/clinica/medicos/"),
  async vincularSecretaria(secretariaId) {
    if (!secretariaId) throw new Error("secretariaId é obrigatório")

    // Resolver id da clínica
    let clinicaId = null
    try {
      // Primeiro tenta /clinicas/me/
      try {
        const meRes = await api.get("/clinicas/me/")
        if (meRes?.data?.id) clinicaId = meRes.data.id
      } catch {}

      // Fallback: tenta listar e pegar a primeira vinculada
      if (!clinicaId) {
        const listRes = await api.get("/clinicas/")
        const items = Array.isArray(listRes.data?.results) ? listRes.data.results : listRes.data
        if (items?.[0]?.id) clinicaId = items[0].id
      }
    } catch {}
    if (!clinicaId) throw new Error("Não foi possível resolver o ID da clínica.")

    const baseRaw = import.meta.env.VITE_CLINICAS_ENDPOINT || "/clinicas/"
    const base = baseRaw.endsWith("/") ? baseRaw : `${baseRaw}/`

    const candidates = [
      `${base}${clinicaId}/secretarias/`,
      `${base}${clinicaId}/adicionar_secretaria/`,
      `${base}${clinicaId}/vincular_secretaria/`,
    ]
    const bodyCommon = { secretaria: secretariaId, secretaria_id: secretariaId }

    let lastError
    for (const url of candidates) {
      try {
        const res = await api.post(url, bodyCommon)
        return res.data
      } catch (err) {
        const st = err?.response?.status
        if (st === 404 || st === 405) {
          lastError = err
          continue
        }
        throw err
      }
    }
    throw lastError || new Error("Nenhum endpoint de vinculação de secretária encontrado para clínica.")
  },
}
