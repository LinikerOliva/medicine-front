import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DatePicker } from "../../components/ui/date-picker";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card } from "../../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge"
import { secretariaService } from "../../services/secretariaService";
import { medicoService } from "../../services/medicoService";

function gerarSlots(inicio = 8, fim = 18) {
  const slots = [];
  for (let h = inicio; h < fim; h++) {
    const hora = String(h).padStart(2, "0") + ":00";
    slots.push(hora);
  }
  return slots;
}

function extrairHora(registro) {
  // Tenta vários campos conhecidos para obter HH:MM
  const candidatos = [registro.hora, registro.horario, registro.data_hora, registro.inicio, registro.start_time];
  for (const c of candidatos) {
    if (!c) continue;
    if (typeof c === "string") {
      const m1 = c.match(/(\d{2}):(\d{2})/);
      if (m1) return `${m1[1]}:${m1[2]}`;
      const m2 = c.match(/T(\d{2}):(\d{2})/);
      if (m2) return `${m2[1]}:${m2[2]}`;
    }
    if (c instanceof Date) {
      const hh = String(c.getHours()).padStart(2, "0");
      const mm = String(c.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
  }
  return null;
}

function nomeDoPaciente(registro) {
  return (
    registro?.paciente_nome ||
    registro?.paciente?.nome ||
    registro?.paciente?.fullName ||
    registro?.paciente?.name ||
    registro?.nome_paciente ||
    "(Paciente)"
  );
}

function idDaConsulta(registro) {
  return registro?.id || registro?.consulta_id || registro?.agendamento_id || registro?.pk || null
}

function normalizarStatus(s) {
  const raw = String(s || "").toLowerCase()
  if (!raw) return "aguardando"
  if (raw.includes("cancel")) return "cancelada"
  if (raw.includes("confirm")) return "confirmada"
  if (raw.includes("realiz") || raw.includes("conclu")) return "realizada"
  if (raw.includes("andamento") || raw.includes("em_andamento")) return "em_andamento"
  if (raw.includes("agend")) return "aguardando"
  return raw
}

function statusBadge(status) {
  const st = normalizarStatus(status)
  const label = st === "confirmada" ? "Confirmada" : st === "cancelada" ? "Cancelada" : st === "realizada" ? "Realizada" : st === "em_andamento" ? "Em andamento" : "Aguardando"
  const variant = st === "confirmada" ? "success" : st === "cancelada" ? "destructive" : st === "realizada" ? "info" : st === "em_andamento" ? "warning" : "outline"
  return { label, variant }
}

function classesPorStatus(status) {
  const st = normalizarStatus(status)
  if (st === "confirmada") return "bg-green-50"
  if (st === "cancelada") return "bg-red-50"
  if (st === "realizada") return "bg-blue-50"
  if (st === "em_andamento") return "bg-yellow-50"
  return ""
}

export default function AgendaSecretaria() {
  const [medicos, setMedicos] = useState([]);
  const [medicoId, setMedicoId] = useState("");
  const [data, setData] = useState(new Date());
  const [consultas, setConsultas] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [slotSelecionado, setSlotSelecionado] = useState(null);
  const [buscaPaciente, setBuscaPaciente] = useState("");
  const [resultadoPacientes, setResultadoPacientes] = useState([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [observacoes, setObservacoes] = useState("");
  const [modoEdicao, setModoEdicao] = useState(false)
  const [consultaEditando, setConsultaEditando] = useState(null)

  const [inicioHora, setInicioHora] = useState(() => parseInt(localStorage.getItem("secretaria.agenda.inicio") || "8", 10))
  const [fimHora, setFimHora] = useState(() => parseInt(localStorage.getItem("secretaria.agenda.fim") || "18", 10))

  const slots = useMemo(() => gerarSlots(inicioHora, fimHora), [inicioHora, fimHora]);

  useEffect(() => {
    async function carregarMedicos() {
      try {
        const lista = await secretariaService.listarMedicos();
        setMedicos(lista || []);
        if (!medicoId && lista?.length) setMedicoId(String(lista[0].id || lista[0].medico_id));
      } catch (e) {
        console.error("Erro ao listar médicos", e);
      }
    }
    carregarMedicos();
  }, []);

  useEffect(() => {
    async function carregarConsultas() {
      if (!medicoId || !data) return;
      setLoading(true);
      try {
        const dt = format(data, "yyyy-MM-dd");
        const registros = await medicoService.getConsultasDoMedico(medicoId, { date: dt });
        const lista = Array.isArray(registros) ? registros : (Array.isArray(registros?.results) ? registros.results : (registros?.consultas || []))
        setConsultas(lista || [])
      } catch (e) {
        console.error("Erro ao buscar consultas", e);
      } finally {
        setLoading(false);
      }
    }
    carregarConsultas();
  }, [medicoId, data]);

  const mapaAgenda = useMemo(() => {
    const map = new Map();
    for (const c of consultas) {
      const hora = extrairHora(c);
      if (!hora) continue;
      map.set(hora, c);
    }
    return map;
  }, [consultas]);

  async function abrirAgendamento(slot) {
    setModoEdicao(false)
    setConsultaEditando(null)
    setSlotSelecionado(slot);
    setModalAberto(true);
    setBuscaPaciente("");
    setResultadoPacientes([]);
    setPacienteSelecionado(null);
    setObservacoes("");
  }

  async function editarSlot(slot) {
    const registro = mapaAgenda.get(slot)
    if (!registro) return
    setModoEdicao(true)
    setConsultaEditando(registro)
    setSlotSelecionado(slot)
    setModalAberto(true)
    // Prefill paciente e observações
    const pacienteId = registro?.paciente_id || registro?.paciente?.id
    const pacienteNome = registro?.paciente_nome || registro?.paciente?.nome || registro?.paciente?.fullName || registro?.paciente?.name
    if (pacienteId || pacienteNome) {
      setPacienteSelecionado({ id: pacienteId, nome: pacienteNome })
    }
    setObservacoes(registro?.observacoes || registro?.notes || "")
  }

  async function buscarPacientesHandler(q) {
    setBuscaPaciente(q);
    if (!q || q.length < 2) {
      setResultadoPacientes([]);
      return;
    }
    try {
      const res = await secretariaService.buscarPacientes(q);
      setResultadoPacientes(res || []);
    } catch (e) {
      console.error("Erro ao buscar pacientes", e);
    }
  }

  async function confirmarAgendamento() {
    if (modoEdicao) {
      const id = idDaConsulta(consultaEditando)
      if (!id) {
        alert("Consulta sem ID válido para edição.")
        return
      }
      try {
        const payload = {}
        if (pacienteSelecionado?.id) payload.pacienteId = pacienteSelecionado.id
        if (observacoes) payload.observacoes = observacoes
        await secretariaService.atualizarConsulta(id, payload)
        setConsultas((prev) => prev.map((c) => (idDaConsulta(c) === id ? { ...c, paciente_id: pacienteSelecionado?.id || c.paciente_id, paciente_nome: pacienteSelecionado?.nome || nomeDoPaciente(c), observacoes } : c)))
        setModalAberto(false)
        setModoEdicao(false)
        setConsultaEditando(null)
      } catch (e) {
        console.error("Erro ao editar consulta", e)
        alert("Falha ao editar consulta.")
      }
      return
    }

    if (!pacienteSelecionado || !slotSelecionado || !medicoId) return;

    // Bloqueio de dupla-marcação: verifica slot ocupado localmente
    if (mapaAgenda.has(slotSelecionado)) {
      alert("Horário já ocupado. Escolha outro horário.")
      return
    }

    try {
      const dt = format(data, "yyyy-MM-dd");

      // Checagem remota de conflitos: consulta lista e verifica mesmo horário
      try {
        const registros = await secretariaService.getConsultasDoMedico(medicoId, { date: dt })
        const lista = Array.isArray(registros) ? registros : (Array.isArray(registros?.results) ? registros.results : (registros?.consultas || []))
        const conflito = (lista || []).some((c) => extrairHora(c) === slotSelecionado)
        if (conflito) {
          alert("Horário indisponível no servidor. Selecione outro horário.")
          return
        }
      } catch (_) {}

      await secretariaService.agendarConsulta({
        pacienteId: pacienteSelecionado.id || pacienteSelecionado.paciente_id,
        medicoId,
        data: dt,
        hora: slotSelecionado,
        tipo: "rotina",
        motivo: "Agendado pela secretária",
        observacoes,
      });
      // Atualiza agenda localmente
      setConsultas((prev) => [
        ...prev,
        { hora: slotSelecionado, paciente_nome: pacienteSelecionado.nome || pacienteSelecionado.fullName || pacienteSelecionado.name || "Paciente", status: "Confirmada" },
      ]);
      setModalAberto(false);
    } catch (e) {
      console.error("Erro ao agendar", e);
      alert("Falha ao agendar. Verifique disponibilidade ou tente novamente.");
    }
  }

  async function confirmarSlot(slot) {
    const registro = mapaAgenda.get(slot)
    if (!registro) return
    const id = idDaConsulta(registro)
    if (!id) return
    try {
      await secretariaService.confirmarConsulta(id)
      setConsultas((prev) => prev.map((c) => (idDaConsulta(c) === id ? { ...c, status: "Confirmada" } : c)))
    } catch (e) {
      console.error("Erro ao confirmar", e)
      alert("Não foi possível confirmar a consulta.")
    }
  }

  async function cancelarSlot(slot) {
    const registro = mapaAgenda.get(slot)
    if (!registro) return
    const id = idDaConsulta(registro)
    if (!id) return
    const motivo = window.prompt("Motivo do cancelamento:", "Cancelado pela secretária")
    try {
      await secretariaService.cancelarConsulta(id, motivo || "")
      setConsultas((prev) => prev.map((c) => (idDaConsulta(c) === id ? { ...c, status: "Cancelada" } : c)))
    } catch (e) {
      console.error("Erro ao cancelar", e)
      alert("Não foi possível cancelar a consulta.")
    }
  }

  async function presencaSlot(slot) {
    const registro = mapaAgenda.get(slot)
    if (!registro) return
    const id = idDaConsulta(registro)
    if (!id) return
    try {
      await secretariaService.registrarPresenca(id)
      setConsultas((prev) => prev.map((c) => (idDaConsulta(c) === id ? { ...c, status: "Realizada" } : c)))
    } catch (e) {
      console.error("Erro ao marcar presença", e)
      alert("Não foi possível marcar presença.")
    }
  }

  function tituloDia() {
    const nomeMes = format(data, "LLLL", { locale: ptBR });
    const diaSemana = format(data, "EEEE", { locale: ptBR });
    const diaNumero = format(data, "d");
    return `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} • ${diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)} • ${diaNumero}`;
  }

  const horasOptions = Array.from({ length: 17 }, (_, i) => i + 6) // 6..22

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">Agenda diária</h2>
        <span className="text-sm text-muted-foreground">{tituloDia()}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-52">
          <DatePicker date={data} onChange={setData} />
        </div>
        <Select value={medicoId} onValueChange={(v) => setMedicoId(String(v))}>
          <SelectTrigger className="min-w-[220px]">
            <SelectValue placeholder="Selecione o médico" />
          </SelectTrigger>
          <SelectContent>
            {medicos.map((m) => (
              <SelectItem key={m.id || m.medico_id} value={String(m.id || m.medico_id)}>
                {m.nome || m.fullName || m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(inicioHora)} onValueChange={(v) => { setInicioHora(Number(v)); localStorage.setItem("secretaria.agenda.inicio", String(v)) }}>
          <SelectTrigger className="w-24"><SelectValue placeholder="Início" /></SelectTrigger>
          <SelectContent>
            {horasOptions.map((h) => (
              <SelectItem key={`inicio-${h}`} value={String(h)}>{String(h).padStart(2, "0")}:00</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(fimHora)} onValueChange={(v) => { setFimHora(Number(v)); localStorage.setItem("secretaria.agenda.fim", String(v)) }}>
          <SelectTrigger className="w-24"><SelectValue placeholder="Fim" /></SelectTrigger>
          <SelectContent>
            {horasOptions.map((h) => (
              <SelectItem key={`fim-${h}`} value={String(h)}>{String(h).padStart(2, "0")}:00</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="secondary" onClick={() => {
          // re-dispara efeito de carga
          setData(new Date(data));
        }}>Atualizar</Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="divide-y">
          {slots.map((hora) => {
            const registro = mapaAgenda.get(hora);
            const paciente = registro ? nomeDoPaciente(registro) : null
            const stInfo = registro ? statusBadge(registro?.status) : null
            const rowClass = registro ? classesPorStatus(registro?.status) : ""
            return (
              <div key={hora} className={`flex items-center justify-between px-4 py-3 hover:bg-muted/40 ${rowClass}`}>
                <div className="flex items-center gap-4">
                  <div className="w-16 text-sm font-medium">{hora}</div>
                  <div className="text-sm flex items-center gap-2">
                    {paciente ? (
                      <>
                        <span>{paciente}</span>
                        {stInfo && (
                          <Badge variant={stInfo.variant} className="text-xs">{stInfo.label}</Badge>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">(vago)</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!paciente ? (
                    <Button size="sm" onClick={() => abrirAgendamento(hora)}>Agendar</Button>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => confirmarSlot(hora)} disabled={normalizarStatus(registro?.status) === "confirmada"}>Confirmar</Button>
                      <Button size="sm" variant="outline" onClick={() => presencaSlot(hora)} disabled={normalizarStatus(registro?.status) === "cancelada"}>Presença</Button>
                      <Button size="sm" variant="outline" onClick={() => editarSlot(hora)}>Editar</Button>
                      <Button size="sm" variant="destructive" onClick={() => cancelarSlot(hora)}>Cancelar</Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modoEdicao ? `Editar ${slotSelecionado}` : `Agendar ${slotSelecionado}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Buscar paciente pelo nome"
              value={buscaPaciente}
              onChange={(e) => buscarPacientesHandler(e.target.value)}
            />
            <div className="max-h-48 overflow-auto border rounded">
              {(resultadoPacientes || []).map((p) => (
                <div
                  key={p.id || p.paciente_id}
                  className={`px-3 py-2 cursor-pointer hover:bg-muted ${
                    (pacienteSelecionado?.id || pacienteSelecionado?.paciente_id) === (p.id || p.paciente_id) ? "bg-muted" : ""
                  }`}
                  onClick={() => setPacienteSelecionado(p)}
                >
                  {p.nome || p.fullName || p.name}
                </div>
              ))}
              {(!resultadoPacientes || resultadoPacientes.length === 0) && (
                <div className="px-3 py-2 text-sm text-muted-foreground">Digite ao menos 2 letras para buscar</div>
              )}
            </div>
            <Input
              placeholder="Observações (opcional)"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={confirmarAgendamento} disabled={!modoEdicao && !pacienteSelecionado}>{modoEdicao ? "Salvar" : "Confirmar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading && <div className="text-sm text-muted-foreground">Carregando consultas…</div>}
    </div>
  );
}