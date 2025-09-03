"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Stethoscope, User, Search, CheckCircle2, XCircle, CheckSquare } from "lucide-react"
import { secretariaService } from "@/services/secretariaService"
import { medicoService } from "@/services/medicoService"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Link } from "react-router-dom"

function formatName(obj) {
  if (!obj) return "—"
  const full = [obj?.user?.first_name, obj?.user?.last_name].filter(Boolean).join(" ").trim()
  return obj?.nome || full || obj?.user?.username || `Médico #${obj?.id ?? "?"}`
}

function normalizeConsulta(c = {}) {
  const pacienteNome =
    c.paciente_nome ||
    c?.paciente?.nome ||
    (c?.paciente?.user ? [c.paciente.user.first_name, c.paciente.user.last_name].filter(Boolean).join(" ") : null) ||
    "Paciente"

  const dataHora = c.data_hora || c.horario || c.inicio || c.data || c.start_time || ""
  const status = c.status || "Agendada"
  const clinica = c.clinica_nome || c?.clinica?.nome || c.local || "—"

  return {
    id: c.id || c.consulta_id || Math.random().toString(36).slice(2),
    pacienteNome,
    dataHora,
    status,
    clinica,
    tipo: c.tipo || c.modalidade || "Consulta",
  }
}

export default function DashboardSecretaria() {
  const [medicos, setMedicos] = useState([])
  const [medicoId, setMedicoId] = useState(null)
  const [loadingMedicos, setLoadingMedicos] = useState(true)
  const [loadingConsultas, setLoadingConsultas] = useState(false)
  const [consultas, setConsultas] = useState([])
  const { toast } = useToast()

  // Filtros e busca
  const [statusFiltro, setStatusFiltro] = useState("todas")
  const [buscaPaciente, setBuscaPaciente] = useState("")

  // Modal Agendar Consulta
  const [openAgendar, setOpenAgendar] = useState(false)
  const [agendarLoading, setAgendarLoading] = useState(false)
  const [formAg, setFormAg] = useState({ pacienteId: "", data: "", hora: "", tipo: "primeira", motivo: "", observacoes: "" })
  const [buscaPacQuery, setBuscaPacQuery] = useState("")
  const [buscaPacLoading, setBuscaPacLoading] = useState(false)
  const [buscaPacResults, setBuscaPacResults] = useState([])

  // Carrega médicos vinculados
  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoadingMedicos(true)
      try {
        const list = await secretariaService.listarMedicos()
        if (!mounted) return
        setMedicos(Array.isArray(list) ? list : [])
        // Seleciona do localStorage ou primeiro
        const stored = localStorage.getItem("secretaria.medicoId")
        const hasStored = stored && list?.some((m) => String(m.id) === String(stored))
        const initial = hasStored ? stored : list?.[0]?.id
        if (initial) setMedicoId(String(initial))
      } finally {
        if (mounted) setLoadingMedicos(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  async function carregarConsultasHoje(mid) {
    const medico = mid ?? medicoId
    if (!medico) return
    setLoadingConsultas(true)
    try {
      localStorage.setItem("secretaria.medicoId", String(medico))
      const data = await medicoService.getConsultasHoje(medico)
      const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
      setConsultas(list.map(normalizeConsulta))
    } catch (e) {
      setConsultas([])
    } finally {
      setLoadingConsultas(false)
    }
  }

  // Carrega consultas de hoje ao trocar o médico
  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!medicoId) return
      await carregarConsultasHoje(medicoId)
    })()
    return () => {
      mounted = false
    }
  }, [medicoId])

  const medicoOptions = useMemo(() => medicos.map((m) => ({ value: String(m.id), label: formatName(m) })), [medicos])

  // Filtragem local por status e busca
  const consultasFiltradas = useMemo(() => {
    const term = (buscaPaciente || "").toLowerCase().trim()
    return consultas.filter((c) => {
      const st = String(c.status || "").toLowerCase()
      const okStatus =
        statusFiltro === "todas" ||
        (statusFiltro === "pendentes" && (st.includes("agend") || st.includes("pend"))) ||
        (statusFiltro === "confirmadas" && st.includes("confirm")) ||
        (statusFiltro === "canceladas" && st.includes("cancel")) ||
        (statusFiltro === "realizadas" && (st.includes("realiz") || st.includes("conclu") || st.includes("final")))
      const okBusca = term ? (c.pacienteNome || "").toLowerCase().includes(term) : true
      return okStatus && okBusca
    })
  }, [consultas, statusFiltro, buscaPaciente])

  function formatHora(dtLike) {
    if (!dtLike) return "—"
    try {
      const d = new Date(dtLike)
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch {
      return String(dtLike).slice(11, 16) || "—"
    }
  }

  // Ações de status
  const atualizarLocalStatus = (id, novo) => {
    setConsultas((prev) => prev.map((c) => (String(c.id) === String(id) ? { ...c, status: novo } : c)))
  }

  const confirmar = async (c) => {
    try {
      await secretariaService.confirmarConsulta(c.id)
      atualizarLocalStatus(c.id, "Confirmada")
      toast({ title: "Consulta confirmada", description: `Paciente ${c.pacienteNome} às ${formatHora(c.dataHora)}` })
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível confirmar a consulta.", variant: "destructive" })
    }
  }
  const cancelar = async (c) => {
    try {
      await secretariaService.cancelarConsulta(c.id)
      atualizarLocalStatus(c.id, "Cancelada")
      toast({ title: "Consulta cancelada", description: `Paciente ${c.pacienteNome} às ${formatHora(c.dataHora)}` })
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível cancelar a consulta.", variant: "destructive" })
    }
  }
  const presenca = async (c) => {
    try {
      await secretariaService.registrarPresenca(c.id)
      atualizarLocalStatus(c.id, "Realizada")
      toast({ title: "Presença registrada", description: `Paciente ${c.pacienteNome} às ${formatHora(c.dataHora)}` })
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível registrar a presença.", variant: "destructive" })
    }
  }

  async function buscarPacientes() {
    setBuscaPacLoading(true)
    try {
      let results = []
      if (buscaPacQuery && buscaPacQuery.trim().length > 1) {
        try {
          const data = await medicoService.buscarPacientes(buscaPacQuery.trim())
          results = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
        } catch {
          // fallback: tenta pacientes vinculados e filtra por nome
          if (medicoId) {
            const vinc = await medicoService.getPacientesVinculados(medicoId)
            const list = Array.isArray(vinc) ? vinc : Array.isArray(vinc?.results) ? vinc.results : []
            const q = buscaPacQuery.toLowerCase()
            results = list.filter((p) => {
              const nome = [p?.nome, p?.user?.first_name, p?.user?.last_name].filter(Boolean).join(" ").toLowerCase()
              return nome.includes(q)
            })
          }
        }
      }
      setBuscaPacResults(results)
    } finally {
      setBuscaPacLoading(false)
    }
  }

  async function submitAgendar(e) {
    e?.preventDefault?.()
    if (!medicoId) {
      toast({ title: "Selecione um médico", description: "Escolha o médico para agendar a consulta.", variant: "destructive" })
      return
    }
    if (!formAg.pacienteId || !formAg.data || !formAg.hora) {
      toast({ title: "Campos obrigatórios", description: "Informe paciente, data e hora.", variant: "destructive" })
      return
    }
    setAgendarLoading(true)
    try {
      await secretariaService.agendarConsulta({
        paciente: formAg.pacienteId,
        medico: medicoId,
        data: formAg.data,
        hora: formAg.hora,
        tipo: formAg.tipo,
        motivo: formAg.motivo,
        observacoes: formAg.observacoes,
      })
      toast({ title: "Consulta agendada", description: "O agendamento foi criado com sucesso." })
      setOpenAgendar(false)
      setFormAg({ pacienteId: "", data: "", hora: "", tipo: "primeira", motivo: "", observacoes: "" })
      setBuscaPacQuery("")
      setBuscaPacResults([])
      // Atualiza lista de hoje
      await carregarConsultasHoje(medicoId)
    } catch (err) {
      const msg = err?.response?.data?.detail || "Não foi possível agendar. Verifique os dados."
      toast({ title: "Erro ao agendar", description: msg, variant: "destructive" })
    } finally {
      setAgendarLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Stethoscope className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-semibold">Dashboard da Secretária</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecione o médico</CardTitle>
          <CardDescription>Visualize rapidamente as consultas de hoje do médico selecionado.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingMedicos ? (
            <Skeleton className="h-10 w-72" />
          ) : (
            <div className="w-72">
              <Select value={medicoId ?? undefined} onValueChange={(v) => setMedicoId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um médico" />
                </SelectTrigger>
                <SelectContent>
                  {medicoOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" /> Consultas de hoje
              </CardTitle>
              <CardDescription>
                {loadingConsultas ? "Carregando..." : `${consultasFiltradas.length} consulta(s) encontrada(s)`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/secretaria/pacientes">
                <Button variant="outline" className="whitespace-nowrap">
                  <User className="h-4 w-4 mr-1" /> Pacientes
                </Button>
              </Link>
              <Dialog open={openAgendar} onOpenChange={setOpenAgendar}>
                <DialogTrigger asChild>
                  <Button variant="default" className="whitespace-nowrap">
                    + Agendar consulta
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo agendamento</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={submitAgendar} className="px-6 pb-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-muted-foreground">Médico</label>
                        <Select value={medicoId ?? undefined} onValueChange={setMedicoId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Escolha um médico" />
                          </SelectTrigger>
                          <SelectContent>
                            {medicoOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Paciente</label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Nome, CPF ou código"
                            value={buscaPacQuery}
                            onChange={(e) => setBuscaPacQuery(e.target.value)}
                          />
                          <Button type="button" variant="secondary" onClick={buscarPacientes} disabled={buscaPacLoading}>
                            {buscaPacLoading ? "Buscando..." : "Buscar"}
                          </Button>
                        </div>
                        {buscaPacResults?.length > 0 && (
                          <div className="mt-2">
                            <Select
                              value={formAg.pacienteId || undefined}
                              onValueChange={(v) => setFormAg((s) => ({ ...s, pacienteId: v }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o paciente" />
                              </SelectTrigger>
                              <SelectContent>
                                {buscaPacResults.map((p) => {
                                  const nome =
                                    p?.nome ||
                                    [p?.user?.first_name, p?.user?.last_name].filter(Boolean).join(" ") ||
                                    p?.user?.username ||
                                    `Paciente #${p?.id}`
                                  return (
                                    <SelectItem key={p.id} value={String(p.id)}>
                                      {nome}
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Data</label>
                        <Input type="date" value={formAg.data} onChange={(e) => setFormAg((s) => ({ ...s, data: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Hora</label>
                        <Input type="time" value={formAg.hora} onChange={(e) => setFormAg((s) => ({ ...s, hora: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Tipo</label>
                        <Select value={formAg.tipo} onValueChange={(v) => setFormAg((s) => ({ ...s, tipo: v }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Tipo de consulta" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="primeira">Primeira consulta</SelectItem>
                            <SelectItem value="retorno">Retorno</SelectItem>
                            <SelectItem value="rotina">Rotina</SelectItem>
                            <SelectItem value="urgencia">Urgência</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Motivo</label>
                        <Input value={formAg.motivo} onChange={(e) => setFormAg((s) => ({ ...s, motivo: e.target.value }))} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm text-muted-foreground">Observações</label>
                        <Textarea rows={3} value={formAg.observacoes} onChange={(e) => setFormAg((s) => ({ ...s, observacoes: e.target.value }))} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setOpenAgendar(false)} disabled={agendarLoading}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={agendarLoading}>
                        {agendarLoading ? "Agendando..." : "Agendar"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros e busca */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mb-4">
            <div>
              <label className="text-sm text-muted-foreground">Status</label>
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="pendentes">Pendentes</SelectItem>
                  <SelectItem value="confirmadas">Confirmadas</SelectItem>
                  <SelectItem value="canceladas">Canceladas</SelectItem>
                  <SelectItem value="realizadas">Realizadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-muted-foreground">Buscar paciente</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-10" placeholder="Ex.: Ana, 123.456.789-00 ou #123" value={buscaPaciente} onChange={(e) => setBuscaPaciente(e.target.value)} />
              </div>
            </div>
          </div>

          {loadingConsultas ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-2/4" />
            </div>
          ) : consultasFiltradas.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma consulta para hoje com os filtros aplicados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Clínica</TableHead>
                  <TableHead className="w-[1%] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consultasFiltradas.map((c) => {
                  const st = String(c.status || "").toLowerCase()
                  const podeConfirmar = st.includes("agend") || st.includes("pend")
                  const podeCancelar = !st.includes("cancel") && !st.includes("realiz") && !st.includes("conclu")
                  const podePresenca = st.includes("confirm") || st.includes("agend")
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4" /> {c.pacienteNome}
                      </TableCell>
                      <TableCell>{c.dataHora ? new Date(c.dataHora).toLocaleString() : "—"}</TableCell>
                      <TableCell>{c.tipo}</TableCell>
                      <TableCell>{c.status}</TableCell>
                      <TableCell>{c.clinica}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" disabled={!podeConfirmar} onClick={() => confirmar(c)}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar
                          </Button>
                          <Button size="sm" variant="destructive" disabled={!podeCancelar} onClick={() => cancelar(c)}>
                            <XCircle className="h-4 w-4 mr-1" /> Cancelar
                          </Button>
                          <Button size="sm" variant="secondary" disabled={!podePresenca} onClick={() => presenca(c)}>
                            <CheckSquare className="h-4 w-4 mr-1" /> Presença
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}