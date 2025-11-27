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

  async listarSolicitacoesHoje(medicoId) {
    try {
      const base = (import.meta.env.VITE_SOLICITACOES_ENDPOINT || "/solicitacoes/").replace(/\/?$/, "/")
      const { data } = await api.get(base, {
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

  async aceitarSolicitacao(id) {
    const base = (import.meta.env.VITE_SOLICITACOES_ENDPOINT || "/solicitacoes/").replace(/\/?$/, "/")
    const candidates = [
      `${base}${id}/aceitar/`,
      `${base}${id}/aceitar`,
      `${base}${id}/`,
    ]
    let lastErr = null
    for (const u of candidates) {
      try {
        if (u.endsWith('/aceitar/') || u.endsWith('/aceitar')) { const { data } = await api.post(u); return data }
        const { data } = await api.patch(u, { status: 'CONFIRMADO', situacao: 'CONFIRMADO', state: 'CONFIRMADO' }); return data
      } catch (e) { const st = e?.response?.status; if (st===401) throw e; lastErr = e; continue }
    }
    // Fallback: confirmar como consulta/agendamento
    try { return await this.confirmarConsulta(id) } catch (_) {}
    if (lastErr) throw lastErr
    return { ok: false }
  },

  async recusarSolicitacao(id) {
    const base = (import.meta.env.VITE_SOLICITACOES_ENDPOINT || "/solicitacoes/").replace(/\/?$/, "/")
    const candidates = [
      `${base}${id}/recusar/`,
      `${base}${id}/recusar`,
      `${base}${id}/`,
    ]
    let lastErr = null
    for (const u of candidates) {
      try {
        if (u.endsWith('/recusar/') || u.endsWith('/recusar')) { const { data } = await api.post(u); return data }
        const { data } = await api.patch(u, { status: 'CANCELADO', situacao: 'CANCELADO', state: 'CANCELADO' }); return data
      } catch (e) { const st = e?.response?.status; if (st===401) throw e; lastErr = e; continue }
    }
    if (lastErr) throw lastErr
    return { ok: false }
  },

  async cancelarSolicitacao(id) {
    const base = (import.meta.env.VITE_SOLICITACOES_ENDPOINT || "/solicitacoes/").replace(/\/?$/, "/")
    const candidates = [
      `${base}${id}/cancelar/`,
      `${base}${id}/cancelar`,
      `${base}${id}/`,
    ]
    let lastErr = null
    for (const u of candidates) {
      try {
        if (u.endsWith('/cancelar/') || u.endsWith('/cancelar')) { const { data } = await api.post(u); return data }
        const { data } = await api.patch(u, { status: 'CANCELADO', situacao: 'CANCELADO', state: 'CANCELADO' }); return data
      } catch (e) { const st = e?.response?.status; if (st===401) throw e; lastErr = e; continue }
    }
    // Fallback: cancelar como consulta/agendamento
    try { return await this.cancelarConsulta(id, 'cancelado pela secretaria') } catch (_) {}
    if (lastErr) throw lastErr
    return { ok: false }
  },

  async registrarSolicitacao(payload = {}) {
    const base = (import.meta.env.VITE_SOLICITACOES_ENDPOINT || "/solicitacoes/").replace(/\/?$/, "/")
    const consBase = (import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/").replace(/\/?$/, "/")
    const normalized = { ...payload }
    // Campos comuns
    normalized.status = (normalized.status || normalized.situacao || "PENDENTE").toString().toUpperCase()
    normalized.situacao = normalized.status
    normalized.tipo = normalized.tipo || "inicial"
    if (normalized.tipo === "primeira") normalized.tipo = "inicial"
    if (!normalized.modalidade) normalized.modalidade = "presencial"
    // Prioriza endpoint dedicado; fallback em /consultas/ com status pendente
    const candidates = [
      base,
      `${base}consultas/`,
      `${consBase}solicitacoes/`,
      consBase,
    ]
    let lastErr = null
    for (const raw of candidates) {
      if (!raw) continue
      const url = raw.endsWith("/") ? raw : `${raw}/`
      try {
        const { data } = await api.post(url, normalized)
        return data
      } catch (e) {
        const st = e?.response?.status
        if (st === 401) throw e
        lastErr = e
        continue
      }
    }
    if (lastErr) throw lastErr
    return { ok: false }
  },

  async agendarConsulta(payload) {
    const agBase = (import.meta.env.VITE_AGENDAMENTOS_ENDPOINT || "/agendamentos/").replace(/\/?$/, "/")
    const consBase = (import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/").replace(/\/?$/, "/")
    const p = { ...(payload || {}) }
    const pid = p.pacienteId || p.paciente_id || p.paciente
    const mid = p.medicoId || p.medico_id || p.medico
    const d = p.data || p.dia || p.data_consulta
    const h = p.hora || p.horario
    const iso = (d && h && /^\d{4}-\d{2}-\d{2}$/.test(String(d)) && /^\d{2}:\d{2}$/.test(String(h))) ? `${d}T${h}:00` : (p.data_hora || null)
    const body = {
      paciente: pid, paciente_id: pid,
      medico: mid, medico_id: mid,
      data: d, dia: d, data_consulta: d, "data__date": d,
      hora: h, horario: h,
      data_hora: iso,
      tipo: p.tipo || "rotina",
      motivo: p.motivo || p.observacoes || "Agendado",
      observacoes: p.observacoes || undefined,
      status: (p.status || "PENDENTE").toString().toUpperCase(),
      situacao: (p.situacao || p.status || "PENDENTE").toString().toUpperCase(),
      state: (p.state || p.situacao || p.status || "PENDENTE").toString().toUpperCase(),
    }
    const candidates = [ agBase, consBase, `${agBase}create/`, `${consBase}create/` ]
    let lastErr = null
    for (const raw of candidates) {
      const url = raw.endsWith("/") ? raw : `${raw}/`
      try { const { data } = await api.post(url, body); return data } catch (e) { const st = e?.response?.status; if (st===401) throw e; lastErr = e; continue }
    }
    if (lastErr) throw lastErr
    return { ok: false }
  },

  async atualizarConsulta(id, payload) {
    const endpoint = (import.meta.env.VITE_AGENDAMENTOS_ENDPOINT || "/agendamentos/") + `${id}/`;
    const { data } = await api.patch(endpoint, payload);
    return data;
  },

  async atualizarStatus(id, status) {
    const endpoint = (import.meta.env.VITE_AGENDAMENTOS_ENDPOINT || "/agendamentos/") + `${id}/`;
    const st = String(status || "").toLowerCase()
    const payload = {
      status: st,
      situacao: st,
      state: st,
    }
    const { data } = await api.patch(endpoint, payload);
    return data;
  },

  // Propor nova data/hora para uma solicitação/consulta (contraproposta)
  async proporNovaData(id, dataHora) {
    const agBase = (import.meta.env.VITE_AGENDAMENTOS_ENDPOINT || "/agendamentos/").replace(/\/?$/, "/")
    const consBase = (import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/").replace(/\/?$/, "/")
    const solBase = (import.meta.env.VITE_SOLICITACOES_ENDPOINT || "/solicitacoes/").replace(/\/?$/, "/")
    const agSing = agBase.replace(/agendamentos\/?$/i, 'agendamento/')
    const consSing = consBase.replace(/consultas\/?$/i, 'consulta/')
    const solSing = solBase.replace(/solicitacoes\/?$/i, 'solicitacao/')
    const buildBody = (dt) => {
      const iso = typeof dt === "string" ? dt : (dt instanceof Date ? dt.toISOString() : String(dt))
      const d = (() => {
        const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso)
        return m ? m[1] : null
      })()
      const h = (() => {
        const m = /T(\d{2}):(\d{2})/.exec(iso)
        return m ? `${m[1]}:${m[2]}` : null
      })()
      const body = { status: "aguardando_paciente", situacao: "aguardando_paciente" }
      if (iso) body.data_hora = iso
      if (d) { body.data = d; body.dia = d; body["data__date"] = d }
      if (h) { body.hora = h; body.horario = h }
      return body
    }
    const body = buildBody(dataHora)
    const candidates = [
      `${agBase}${id}/propor/`,
      `${agBase}${id}/contraproposta/`,
      `${consBase}${id}/propor/`,
      `${consBase}${id}/contraproposta/`,
      `${solBase}${id}/propor/`,
      `${solBase}${id}/contraproposta/`,
      `${agSing}${id}/propor/`,
      `${agSing}${id}/contraproposta/`,
      `${consSing}${id}/propor/`,
      `${consSing}${id}/contraproposta/`,
      `${solSing}${id}/propor/`,
      `${solSing}${id}/contraproposta/`,
      `${agBase}${id}/`,
      `${consBase}${id}/`,
      `${solBase}${id}/`,
      `${agSing}${id}/`,
      `${consSing}${id}/`,
      `${solSing}${id}/`,
    ]
    let lastErr = null
    for (const u of candidates) {
      try {
        if (/\/(propor|contraproposta)\/$/.test(u)) { const { data } = await api.post(u, body); return data }
        const { data } = await api.patch(u, body); return data
      } catch (e) { const st = e?.response?.status; if (st===401) throw e; lastErr = e; continue }
    }
    if (lastErr) throw lastErr
    throw new Error("Endpoint de contraproposta não encontrado")
  },

  // Reagendar mantendo status confirmado
  async reagendarConsulta(id, dataHora) {
    const agBase = (import.meta.env.VITE_AGENDAMENTOS_ENDPOINT || "/agendamentos/").replace(/\/?$/, "/")
    const consBase = (import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/").replace(/\/?$/, "/")
    const solBase = (import.meta.env.VITE_SOLICITACOES_ENDPOINT || "/solicitacoes/").replace(/\/?$/, "/")
    const agSing = agBase.replace(/agendamentos\/?$/i, 'agendamento/')
    const consSing = consBase.replace(/consultas\/?$/i, 'consulta/')
    const solSing = solBase.replace(/solicitacoes\/?$/i, 'solicitacao/')
    const buildBody = (dt) => {
      const iso = typeof dt === "string" ? dt : (dt instanceof Date ? dt.toISOString() : String(dt))
      const d = (() => { const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso); return m ? m[1] : null })()
      const h = (() => { const m = /T(\d{2}):(\d{2})/.exec(iso); return m ? `${m[1]}:${m[2]}` : null })()
      const body = { status: "confirmado", situacao: "confirmada" }
      if (iso) body.data_hora = iso
      if (d) { body.data = d; body.dia = d; body["data__date"] = d }
      if (h) { body.hora = h; body.horario = h }
      return body
    }
    const body = buildBody(dataHora)
    const candidates = [
      `${agBase}${id}/reagendar/`,
      `${consBase}${id}/reagendar/`,
      `${solBase}${id}/reagendar/`,
      `${agSing}${id}/reagendar/`,
      `${consSing}${id}/reagendar/`,
      `${solSing}${id}/reagendar/`,
      `${agBase}${id}/`,
      `${consBase}${id}/`,
      `${solBase}${id}/`,
      `${agSing}${id}/`,
      `${consSing}${id}/`,
      `${solSing}${id}/`,
    ]
    let lastErr = null
    for (const u of candidates) {
      try {
        if (/\/(reagendar)\/$/.test(u)) { const { data } = await api.post(u, body); return data }
        const { data } = await api.patch(u, body); return data
      } catch (e) { const st = e?.response?.status; if (st===401) throw e; lastErr = e; continue }
    }
    if (lastErr) throw lastErr
    throw new Error("Endpoint de reagendamento não encontrado")
  },

  async confirmarConsulta(id) {
    const agBase = (import.meta.env.VITE_AGENDAMENTOS_ENDPOINT || "/agendamentos/").replace(/\/?$/, "/")
    const consBase = (import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/").replace(/\/?$/, "/")
    const solBase = (import.meta.env.VITE_SOLICITACOES_ENDPOINT || "/solicitacoes/").replace(/\/?$/, "/")
    const agSing = agBase.replace(/agendamentos\/?$/i, 'agendamento/')
    const consSing = consBase.replace(/consultas\/?$/i, 'consulta/')
    const solSing = solBase.replace(/solicitacoes\/?$/i, 'solicitacao/')
    const candidates = [
      `${agBase}${id}/confirmar/`,
      `${consBase}${id}/confirmar/`,
      `${solBase}${id}/aceitar/`,
      `${solBase}${id}/confirmar/`,
      `${agSing}${id}/confirmar/`,
      `${consSing}${id}/confirmar/`,
      `${solSing}${id}/aceitar/`,
      `${solSing}${id}/confirmar/`,
      `${agBase}confirmar/${id}/`,
      `${consBase}confirmar/${id}/`,
      `${solBase}confirmar/${id}/`,
      `${agBase}${id}/`,
      `${consBase}${id}/`,
      `${solBase}${id}/`,
      `${agSing}${id}/`,
      `${consSing}${id}/`,
      `${solSing}${id}/`,
    ]
    let lastErr = null
    for (const u of candidates) {
      try {
        if (/[\/]confirmar\/$/.test(u) || /[\/]aceitar\/$/.test(u)) { const { data } = await api.post(u); return data }
        const { data } = await api.patch(u, { status: "CONFIRMADO", situacao: "CONFIRMADO", state: "CONFIRMADO" }); return data
      } catch (e) {
        const st = e?.response?.status
        if (st === 401) throw e
        lastErr = e
        continue
      }
    }
    // Fallback: tentar localizar a solicitacao relacionada por filtros
    try {
      const listBase = solBase
      const filters = ["consulta","consulta_id","agendamento","agendamento_id","id","pk","uuid"]
      for (const k of filters) {
        try {
          const { data } = await api.get(listBase, { params: { [k]: id, limit: 1, page_size: 1 } })
          const arr = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])
          const item = arr?.[0]
          const sid = item?.id || item?.pk || item?.uuid
          if (sid) {
            const acceptCandidates = [
              `${solBase}${sid}/aceitar/`,
              `${solSing}${sid}/aceitar/`,
              `${solBase}${sid}/`,
              `${solSing}${sid}/`,
            ]
            for (const ep of acceptCandidates) {
              try {
                if (/[\/]aceitar\/$/.test(ep)) { const { data } = await api.post(ep); return data }
                const { data } = await api.patch(ep, { status: "CONFIRMADO", situacao: "CONFIRMADO", state: "CONFIRMADO" }); return data
              } catch (e2) { lastErr = e2; continue }
            }
          }
        } catch (_) {}
      }
    } catch (_) {}
    if (lastErr) throw lastErr
    throw new Error("Endpoint de confirmação não encontrado")
  },

  async cancelarConsulta(id, motivo) {
    const agBase = (import.meta.env.VITE_AGENDAMENTOS_ENDPOINT || "/agendamentos/").replace(/\/?$/, "/")
    const consBase = (import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/").replace(/\/?$/, "/")
    const solBase = (import.meta.env.VITE_SOLICITACOES_ENDPOINT || "/solicitacoes/").replace(/\/?$/, "/")
    const agSing = agBase.replace(/agendamentos\/?$/i, 'agendamento/')
    const consSing = consBase.replace(/consultas\/?$/i, 'consulta/')
    const solSing = solBase.replace(/solicitacoes\/?$/i, 'solicitacao/')
    const candidates = [
      `${agBase}${id}/cancelar/`,
      `${consBase}${id}/cancelar/`,
      `${solBase}${id}/cancelar/`,
      `${agSing}${id}/cancelar/`,
      `${consSing}${id}/cancelar/`,
      `${solSing}${id}/cancelar/`,
      `${agBase}${id}/`,
      `${consBase}${id}/`,
      `${solBase}${id}/`,
      `${agSing}${id}/`,
      `${consSing}${id}/`,
      `${solSing}${id}/`,
    ]
    let lastErr = null
    for (const u of candidates) {
      try {
        if (u.endsWith("/cancelar/")) { const { data } = await api.post(u, { motivo }); return data }
        const { data } = await api.patch(u, { status: "CANCELADO", situacao: "CANCELADO", state: "CANCELADO", motivo_cancelamento: motivo }); return data
      } catch (e) {
        const st = e?.response?.status
        if (st === 401) throw e
        lastErr = e
        continue
      }
    }
    if (lastErr) throw lastErr
    throw new Error("Endpoint de cancelamento não encontrado")
  },

  async registrarPresenca(id) {
    const agBase = (import.meta.env.VITE_AGENDAMENTOS_ENDPOINT || "/agendamentos/").replace(/\/?$/, "/")
    const consBase = (import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/").replace(/\/?$/, "/")
    const candidates = [
      `${agBase}${id}/presenca/`,
      `${consBase}${id}/presenca/`,
      `${agBase}${id}/`,
      `${consBase}${id}/`,
    ]
    let lastErr = null
    for (const u of candidates) {
      try {
        if (u.endsWith("/presenca/")) { const { data } = await api.post(u); return data }
        const { data } = await api.patch(u, { status: "REALIZADA", situacao: "REALIZADA", state: "REALIZADA" }); return data
      } catch (e) {
        const st = e?.response?.status
        if (st === 401) throw e
        lastErr = e
        continue
      }
    }
    if (lastErr) throw lastErr
    return { ok: false }
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
