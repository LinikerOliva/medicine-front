import api from "./api";

export const secretariaService = {
  async getPerfil() {
    const { data } = await api.get(import.meta.env.VITE_SECRETARIA_PROFILE_ENDPOINT || "/secretarias/me/");
    return data;
  },

  async listarSecretarias(params = {}) {
    const base = (import.meta.env.VITE_SECRETARIAS_ENDPOINT || "/secretarias/").replace(/\/?$/, "/")
    try {
      const { data } = await api.get(base, { params })
      const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
      return list
    } catch { return [] }
  },

  async listarMedicos() {
    const base = (import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/").replace(/\/?$/, "/")
    const { data } = await api.get(base, { params: { limit: 200 } });
    return Array.isArray(data?.results) ? data.results : data;
  },

  async listarClinicas() {
    const { data } = await api.get(import.meta.env.VITE_CLINICAS_ENDPOINT || "/clinicas/");
    return Array.isArray(data?.results) ? data.results : data;
  },

  async getConsultasDoMedico(medicoId, params = {}) {
    const endpointBase = import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/";
    const url = medicoId ? `${endpointBase}?medico=${medicoId}` : endpointBase;
    const { data } = await api.get(url, { params });
    return data;
  },

  async listarConsultasHoje(medicoId) {
    try {
      const { data } = await api.get((import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/").replace(/\/?$/, "/"), {
        params: (() => {
          const d = new Date(); const pad = (n) => String(n).padStart(2, "0"); const today = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
          const p = { date: today, data: today, dia: today, "data__date": today }
          if (medicoId) { p.medico = medicoId; p.medico_id = medicoId }
          return p
        })()
      })
      const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
      return list
    } catch { return [] }
  },

  async agendarConsulta(payload) {
    const endpoint = import.meta.env.VITE_AGENDAMENTOS_ENDPOINT || "/agendamentos/";
    const { data } = await api.post(endpoint, payload);
    return data;
  },

  async atualizarConsulta(id, payload) {
    const endpoint = (import.meta.env.VITE_AGENDAMENTOS_ENDPOINT || "/agendamentos/") + `${id}/`;
    const { data } = await api.patch(endpoint, payload);
    return data;
  },

  async atualizarStatus(id, status) {
    const endpoint = (import.meta.env.VITE_AGENDAMENTOS_ENDPOINT || "/agendamentos/") + `${id}/`;
    const { data } = await api.patch(endpoint, { status });
    return data;
  },

  async confirmarConsulta(id) {
    const endpoint = (import.meta.env.VITE_AGENDAMENTOS_ENDPOINT || "/agendamentos/") + `${id}/confirmar/`;
    const { data } = await api.post(endpoint);
    return data;
  },

  async cancelarConsulta(id, motivo) {
    const endpoint = (import.meta.env.VITE_AGENDAMENTOS_ENDPOINT || "/agendamentos/") + `${id}/cancelar/`;
    const { data } = await api.post(endpoint, { motivo });
    return data;
  },

  async registrarPresenca(id) {
    const endpoint = (import.meta.env.VITE_AGENDAMENTOS_ENDPOINT || "/agendamentos/") + `${id}/presenca/`;
    const { data } = await api.post(endpoint);
    return data;
  },

  // New: Registrar paciente pela secretaria sem trocar sessão atual
  async registrarPaciente(form) {
    const endpoint = import.meta.env.VITE_AUTH_REGISTER_ENDPOINT || "/auth/register/";

    const nome = String(form?.nome || "").trim();
    const [first_name, ...rest] = nome.split(/\s+/);
    const last_name = rest.join(" ");
    const email = String(form?.email || "").trim();
    const password = String(form?.senha || form?.password || "");

    // gerar username simples a partir do email ou nome
    const baseUser = (email.split("@")[0] || first_name || "paciente").toLowerCase().replace(/[^a-z0-9]/g, "");
    const username = `${baseUser}${Math.floor(Math.random() * 10000)}`;

    const payload = {
      username,
      email,
      password,
      first_name,
      last_name,
      role: "paciente",
      cpf: form?.cpf || "",
      telefone: form?.telefone || "",
      data_nascimento: form?.data_nascimento || "",
      endereco: form?.endereco || "",
    };

    const { data } = await api.post(endpoint, payload, {
      // Important: do not replace Authorization tokens in interceptors
      // We assume api instance keeps current secretary auth headers unchanged
    });

    return data;
  },

  async buscarPacientes(query) {
    try {
      const base = (import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/").replace(/\/?$/, "/")
      const { data } = await api.get(base, { params: { search: query, limit: 20 } })
      let list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
      if (list.length > 0) return list
    } catch {}
    // Fallback: busca em /users/ com role=paciente
    try {
      const usersBase = (import.meta.env.VITE_USERS_ENDPOINT || "/users/").replace(/\/?$/, "/")
      const { data } = await api.get(usersBase, { params: { search: query, limit: 20, role: "paciente", tipo: "paciente" } })
      const raw = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
      // Mapear para formato de paciente mínimo
      const mapped = raw.map((u) => ({ id: u?.id || u?.user_id || u?.pk, user: { first_name: u?.first_name, last_name: u?.last_name, username: u?.username }, nome: u?.nome || undefined, cpf: u?.cpf }))
      return mapped
    } catch {}
    return []
  },

  async getMedicosDaSecretaria(secretariaId) {
    const out = []
    const push = (arr) => {
      const list = Array.isArray(arr) ? arr : (Array.isArray(arr?.results) ? arr.results : [])
      list.forEach((m) => { if (m) out.push(m) })
    }
    if (secretariaId) {
      try {
        const base = (import.meta.env.VITE_SECRETARIAS_ENDPOINT || "/secretarias/").replace(/\/?$/, "/")
        const res = await api.get(`${base}${secretariaId}/medicos/`).catch(() => null)
        if (res?.data) push(res.data)
      } catch {}
    }
    try {
      const prof = await this.getPerfil().catch(() => null)
      const med = prof?.medico || prof?.medico_id
      const meds = prof?.medicos || prof?.medicos_vinculados
      if (med) out.push(med)
      if (Array.isArray(meds)) push(meds)
    } catch {}
    return out
  },

  async vincularMedico(secretariaId, medicoId) {
    if (!secretariaId || !medicoId) throw new Error("IDs obrigatórios")
    const secBase = (import.meta.env.VITE_SECRETARIAS_ENDPOINT || "/secretarias/").replace(/\/?$/, "/")
    const medBase = (import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/").replace(/\/?$/, "/")
    const body = { medico: medicoId, medico_id: medicoId, secretaria: secretariaId, secretaria_id: secretariaId }
    const candidates = [
      { m: "post", u: `${secBase}${secretariaId}/vincular_medico/`, b: body },
      { m: "post", u: `${medBase}${medicoId}/vincular_secretaria/`, b: body },
      { m: "patch", u: `${medBase}${medicoId}/`, b: { secretaria: secretariaId, secretaria_id: secretariaId } },
      { m: "patch", u: `${secBase}${secretariaId}/`, b: { medico: medicoId, medico_id: medicoId } },
    ]
    let lastErr = null
    for (const c of candidates) {
      try { const { data } = await api[c.m](c.u, c.b); return data } catch (e) { lastErr = e }
    }
    if (lastErr) throw lastErr
    return { ok: false }
  },
};
