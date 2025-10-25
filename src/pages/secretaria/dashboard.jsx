"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Stethoscope, User, Search, CheckCircle2, XCircle, CheckSquare, CalendarDays, Eye, TrendingUp, Activity, Clock, Users } from "lucide-react"
import { secretariaService } from "@/services/secretariaService"
import { medicoService } from "@/services/medicoService"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Link } from "react-router-dom"
import { DatePicker } from "@/components/ui/date-picker"

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
        if (hasStored) {
          setMedicoId(stored)
        } else if (list?.length > 0) {
          setMedicoId(String(list[0].id))
        }
      } catch (e) {
        console.error("Erro ao carregar médicos:", e)
      } finally {
        if (mounted) setLoadingMedicos(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  // Carrega consultas quando médico muda
  useEffect(() => {
    if (!medicoId) return
    let mounted = true
    ;(async () => {
      setLoadingConsultas(true)
      try {
        const list = await secretariaService.listarConsultasHoje(medicoId)
        if (!mounted) return
        setConsultas(Array.isArray(list) ? list : [])
        localStorage.setItem("secretaria.medicoId", medicoId)
      } catch (e) {
        console.error("Erro ao carregar consultas:", e)
      } finally {
        if (mounted) setLoadingConsultas(false)
      }
    })()
    return () => { mounted = false }
  }, [medicoId])

  const medicoOptions = useMemo(() => {
    return medicos.map((m) => ({ value: String(m.id), label: m.nome }))
  }, [medicos])

  const consultasFiltradas = useMemo(() => {
    let filtered = consultas
    if (statusFiltro !== "todas") {
      filtered = filtered.filter((c) => c.status === statusFiltro)
    }
    if (buscaPaciente.trim()) {
      const termo = buscaPaciente.toLowerCase()
      filtered = filtered.filter((c) => c.pacienteNome?.toLowerCase().includes(termo))
    }
    return filtered
  }, [consultas, statusFiltro, buscaPaciente])

  const formatHora = (dh) => {
    try {
      const d = new Date(dh)
      if (!isNaN(d.getTime())) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      if (typeof dh === "string" && /^\d{2}:\d{2}/.test(dh)) return dh.slice(0, 5)
    } catch {}
    return "-"
  }

  const atualizarLocalStatus = (consultaId, novoStatus) => {
    setConsultas((prev) => prev.map((c) => (c.id === consultaId ? { ...c, status: novoStatus } : c)))
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

  const submitAgendar = async (e) => {
    e.preventDefault()
    if (!formAg.pacienteId || !formAg.data || !formAg.hora || !medicoId) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" })
      return
    }
    setAgendarLoading(true)
    try {
      await secretariaService.agendarConsulta({
        pacienteId: formAg.pacienteId,
        medicoId,
        data: formAg.data,
        hora: formAg.hora,
        tipo: formAg.tipo,
        motivo: formAg.motivo,
        observacoes: formAg.observacoes,
      })
      toast({ title: "Sucesso", description: "Consulta agendada com sucesso!" })
      setOpenAgendar(false)
      setFormAg({ pacienteId: "", data: "", hora: "", tipo: "primeira", motivo: "", observacoes: "" })
      setBuscaPacQuery("")
      setBuscaPacResults([])
      // Recarregar consultas
      if (medicoId) {
        const list = await secretariaService.listarConsultasHoje(medicoId)
        setConsultas(Array.isArray(list) ? list : [])
      }
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível agendar a consulta.", variant: "destructive" })
    } finally {
      setAgendarLoading(false)
    }
  }

  const buscarPacientes = async (query) => {
    if (!query.trim()) {
      setBuscaPacResults([])
      return
    }
    setBuscaPacLoading(true)
    try {
      const results = await secretariaService.buscarPacientes(query)
      setBuscaPacResults(Array.isArray(results) ? results : [])
    } catch (e) {
      console.error("Erro ao buscar pacientes:", e)
      setBuscaPacResults([])
    } finally {
      setBuscaPacLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => buscarPacientes(buscaPacQuery), 300)
    return () => clearTimeout(timer)
  }, [buscaPacQuery])

  // Estatísticas calculadas
  const stats = useMemo(() => {
    const total = consultas.length
    const confirmadas = consultas.filter(c => c.status === "Confirmada").length
    const pendentes = consultas.filter(c => c.status === "Agendada").length
    const realizadas = consultas.filter(c => c.status === "Realizada").length
    
    return {
      total,
      confirmadas,
      pendentes,
      realizadas
    }
  }, [consultas])

  return (
    <div className="space-y-8">
      {/* Header Moderno */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">
                Dashboard Secretária
              </h1>
              <p className="text-blue-100 text-lg">
                Gerencie consultas e acompanhe a agenda dos médicos.
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 min-w-fit">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-blue-300" />
                  <span className="text-sm font-medium text-blue-100">Total</span>
                </div>
                <div className="text-2xl font-bold">{stats.total}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-300" />
                  <span className="text-sm font-medium text-blue-100">Confirmadas</span>
                </div>
                <div className="text-2xl font-bold text-green-300">{stats.confirmadas}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-orange-300" />
                  <span className="text-sm font-medium text-blue-100">Pendentes</span>
                </div>
                <div className="text-2xl font-bold text-orange-300">{stats.pendentes}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-5 w-5 text-purple-300" />
                  <span className="text-sm font-medium text-blue-100">Realizadas</span>
                </div>
                <div className="text-2xl font-bold text-purple-300">{stats.realizadas}</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-6">
            <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm transition-all duration-200" asChild>
              <Link to="/secretaria/pacientes">
                <User className="h-4 w-4 mr-2" />
                Ver Pacientes
              </Link>
            </Button>
            <Dialog open={openAgendar} onOpenChange={setOpenAgendar}>
              <DialogTrigger asChild>
                <Button className="bg-white text-blue-600 hover:bg-blue-50 transition-all duration-200">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Agendar Consulta
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
                      <label className="text-sm text-muted-foreground">Tipo</label>
                      <Select value={formAg.tipo} onValueChange={(v) => setFormAg((p) => ({ ...p, tipo: v }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="primeira">Primeira consulta</SelectItem>
                          <SelectItem value="retorno">Retorno</SelectItem>
                          <SelectItem value="urgencia">Urgência</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground">Data</label>
                      <DatePicker
                        value={formAg.data}
                        onChange={(val) => setFormAg((p) => ({ ...p, data: val }))}
                        minDate={new Date()}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Hora</label>
                      <Input
                        type="time"
                        value={formAg.hora}
                        onChange={(e) => setFormAg((p) => ({ ...p, hora: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Paciente</label>
                    <Input
                      placeholder="Digite o nome do paciente..."
                      value={buscaPacQuery}
                      onChange={(e) => setBuscaPacQuery(e.target.value)}
                    />
                    {buscaPacLoading && <p className="text-xs text-muted-foreground mt-1">Buscando...</p>}
                    {buscaPacResults.length > 0 && (
                      <div className="mt-2 border rounded-md max-h-32 overflow-y-auto">
                        {buscaPacResults.map((pac) => (
                          <div
                            key={pac.id}
                            className="p-2 hover:bg-muted cursor-pointer text-sm"
                            onClick={() => {
                              setFormAg((p) => ({ ...p, pacienteId: pac.id }))
                              setBuscaPacQuery(pac.nome)
                              setBuscaPacResults([])
                            }}
                          >
                            {pac.nome} - {pac.cpf}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Motivo</label>
                    <Input
                      placeholder="Motivo da consulta"
                      value={formAg.motivo}
                      onChange={(e) => setFormAg((p) => ({ ...p, motivo: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Observações</label>
                    <Textarea
                      placeholder="Observações adicionais"
                      value={formAg.observacoes}
                      onChange={(e) => setFormAg((p) => ({ ...p, observacoes: e.target.value }))}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpenAgendar(false)}>
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
      </div>


      {/* Stats Cards Modernos */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300">Total Consultas</CardTitle>
            <div className="p-2 bg-blue-500 rounded-lg">
              <Calendar className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Consultas hoje
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-green-700 dark:text-green-300">Confirmadas</CardTitle>
            <div className="p-2 bg-green-500 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 dark:text-green-100">{stats.confirmadas}</div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Consultas confirmadas
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-orange-700 dark:text-orange-300">Pendentes</CardTitle>
            <div className="p-2 bg-orange-500 rounded-lg">
              <Clock className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">{stats.pendentes}</div>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              Aguardando confirmação
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-purple-700 dark:text-purple-300">Realizadas</CardTitle>
            <div className="p-2 bg-purple-500 rounded-lg">
              <Activity className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">{stats.realizadas}</div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              Consultas finalizadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seleção de Médico */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Stethoscope className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-slate-800">Selecione o médico</CardTitle>
              <CardDescription className="text-slate-600">
                Visualize rapidamente as consultas de hoje do médico selecionado.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loadingMedicos ? (
            <Skeleton className="h-10 w-72" />
          ) : (
            <div className="w-72">
              <Select value={medicoId ?? undefined} onValueChange={(v) => setMedicoId(v)}>
                <SelectTrigger className="bg-white border-slate-200 hover:bg-slate-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
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

      {/* Consultas de Hoje */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-slate-800">Consultas de hoje</CardTitle>
                <CardDescription className="text-slate-600">
                  {loadingConsultas ? "Carregando..." : `${consultasFiltradas.length} consulta(s) encontrada(s)`}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex-1">
              <Input
                placeholder="Buscar por paciente..."
                value={buscaPaciente}
                onChange={(e) => setBuscaPaciente(e.target.value)}
                className="max-w-sm bg-white border-slate-200 hover:bg-slate-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              />
            </div>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="w-48 bg-white border-slate-200 hover:bg-slate-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="Agendada">Agendadas</SelectItem>
                <SelectItem value="Confirmada">Confirmadas</SelectItem>
                <SelectItem value="Realizada">Realizadas</SelectItem>
                <SelectItem value="Cancelada">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabela de Consultas */}
          {loadingConsultas ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : consultasFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-slate-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Calendar className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium mb-2">Nenhuma consulta encontrada</p>
              <p className="text-slate-500 text-sm">
                {medicoId ? "Não há consultas para o médico selecionado hoje" : "Selecione um médico para ver as consultas"}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="font-semibold text-slate-700">Horário</TableHead>
                    <TableHead className="font-semibold text-slate-700">Paciente</TableHead>
                    <TableHead className="font-semibold text-slate-700">Tipo</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="font-semibold text-slate-700">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consultasFiltradas.map((c) => {
                    const podeConfirmar = c.status === "Agendada"
                    const podeCancelar = ["Agendada", "Confirmada"].includes(c.status)
                    const podePresenca = c.status === "Confirmada"
                    
                    return (
                      <TableRow key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100">
                        <TableCell className="font-medium text-slate-900">{formatHora(c.dataHora)}</TableCell>
                        <TableCell className="text-slate-700">{c.pacienteNome}</TableCell>
                        <TableCell className="text-slate-600">{c.tipo || "Consulta"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            c.status === "Confirmada" ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" :
                            c.status === "Agendada" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400" :
                            c.status === "Realizada" ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400" :
                            "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                          }`}>
                            {c.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              disabled={!podeConfirmar} 
                              onClick={() => confirmar(c)}
                              className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              disabled={!podeCancelar} 
                              onClick={() => cancelar(c)}
                              className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              <XCircle className="h-4 w-4 mr-1" /> Cancelar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              disabled={!podePresenca} 
                              onClick={() => presenca(c)}
                              className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                            >
                              <CheckSquare className="h-4 w-4 mr-1" /> Presença
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}