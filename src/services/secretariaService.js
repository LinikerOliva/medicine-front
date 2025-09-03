import api from "./api";

export const secretariaService = {
  async getPerfil() {
    const { data } = await api.get(import.meta.env.VITE_SECRETARIA_PROFILE_ENDPOINT || "/secretarias/me/");
    return data;
  },

  async listarMedicos() {
    const { data } = await api.get(import.meta.env.VITE_MEDICOS_ENDPOINT || "/medicos/");
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
};