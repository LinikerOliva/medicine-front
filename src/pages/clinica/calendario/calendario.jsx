"use client"

import { useState, useEffect } from "react"
// Remova esta linha de import:
// import { ClinicaLayout } from "../../../layouts/clinica-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import { Badge } from "../../../components/ui/badge"
import { ChevronLeft, ChevronRight, Calendar, Clock, User } from "lucide-react"
import { clinicaService } from "../../../services/clinicaService"
// ADICIONAR: imports de UI e hook de query params
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "../../../components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Input } from "../../../components/ui/input"
import { useSearchParams } from "react-router-dom"

const meses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export default function CalendarioClinica() {
  const [dataAtual, setDataAtual] = useState(new Date())
  const [examesSelecionados, setExamesSelecionados] = useState([])
  const [dataSelecionada, setDataSelecionada] = useState(null)
  const [calendarioData, setCalendarioData] = useState({})
  const [loading, setLoading] = useState(false)

  // ADICIONAR: estados do modal e opções
  const [agendarOpen, setAgendarOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [agendarForm, setAgendarForm] = useState({ paciente: "", tipo: "", hora: "" })
  const [pacientesOptions, setPacientesOptions] = useState([])
  const [tiposOptions, setTiposOptions] = useState([])
  const [searchParams] = useSearchParams()

  const breadcrumbs = [{ label: "Dashboard", href: "/clinica/dashboard" }, { label: "Calendário" }]

  useEffect(() => {
    carregarCalendario()
  }, [dataAtual])

  // ADICIONAR: carregar pacientes e tipos
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [pac, tipos] = await Promise.all([
          clinicaService.getPacientes().catch(() => ({ data: [] })),
          clinicaService.getTiposExame().catch(() => ({ data: [] })),
        ])
        const pacientes = Array.isArray(pac?.data) ? pac.data : (pac?.data?.results || [])
        const tiposList = Array.isArray(tipos?.data) ? tipos.data : (tipos?.data?.results || [])
        setPacientesOptions(pacientes)
        setTiposOptions(tiposList)
      } catch {}
    }
    fetchOptions()
  }, [])

  // ADICIONAR: ler query params (?data=YYYY-MM-DD&paciente=ID)
  useEffect(() => {
    const qpData = searchParams.get("data")
    const qpPaciente = searchParams.get("paciente")
    if (qpData) {
      setDataSelecionada(qpData)
      carregarExamesData(qpData)
    }
    if (qpPaciente) {
      setAgendarForm((f) => ({ ...f, paciente: String(qpPaciente) }))
      setAgendarOpen(true)
    }
  }, []) // apenas na montagem

  const carregarCalendario = async () => {
    setLoading(true)
    try {
      const response = await clinicaService.getCalendario(dataAtual.getMonth() + 1, dataAtual.getFullYear())
      setCalendarioData(response.data || {})
    } catch (error) {
      console.error("Erro ao carregar calendário:", error)
      // Dados mock para demonstração
      setCalendarioData({
        "2024-01-15": { total: 5, status: "ocupado" },
        "2024-01-16": { total: 8, status: "lotado" },
        "2024-01-17": { total: 3, status: "disponivel" },
        "2024-01-18": { total: 6, status: "ocupado" },
        "2024-01-22": { total: 2, status: "disponivel" },
        "2024-01-23": { total: 7, status: "ocupado" },
      })
    } finally {
      setLoading(false)
    }
  }

  const carregarExamesData = async (data) => {
    try {
      const response = await clinicaService.getExamesPorData(data)
      setExamesSelecionados(response.data || [])
    } catch (error) {
      console.error("Erro ao carregar exames:", error)
      // Dados mock
      setExamesSelecionados([
        { id: 1, paciente: "João Silva", tipo: "Ultrassom", horario: "09:00", status: "confirmado" },
        { id: 2, paciente: "Maria Santos", tipo: "Raio-X", horario: "10:30", status: "pendente" },
        { id: 3, paciente: "Pedro Costa", tipo: "Tomografia", horario: "14:00", status: "confirmado" },
      ])
    }
  }

  const navegarMes = (direcao) => {
    const novaData = new Date(dataAtual)
    novaData.setMonth(dataAtual.getMonth() + direcao)
    setDataAtual(novaData)
  }

  const selecionarData = (dia) => {
    const data = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), dia)
    const dataString = data.toISOString().split("T")[0]
    setDataSelecionada(dataString)
    carregarExamesData(dataString)
  }

  // ADICIONAR: abrir modal com paciente opcional
  const abrirModalAgendar = (pacienteId = "") => {
    setAgendarForm({ paciente: pacienteId ? String(pacienteId) : "", tipo: "", hora: "" })
    setAgendarOpen(true)
  }

  // ADICIONAR: salvar agendamento
  const salvarAgendamento = async () => {
    if (!dataSelecionada) return
    const { paciente, tipo, hora } = agendarForm
    if (!paciente || !tipo || !hora) {
      alert("Preencha paciente, tipo e horário.")
      return
    }
    setSalvando(true)
    try {
      const payload = { paciente, tipo, data: dataSelecionada, hora }
      await clinicaService.createExame(payload)
      setAgendarOpen(false)
      setAgendarForm({ paciente: "", tipo: "", hora: "" })
      await carregarExamesData(dataSelecionada)
    } catch {
      alert("Erro ao agendar. Verifique os dados e tente novamente.")
    } finally {
      setSalvando(false)
    }
  }

  const obterDiasDoMes = () => {
    const ano = dataAtual.getFullYear()
    const mes = dataAtual.getMonth()
    const primeiroDia = new Date(ano, mes, 1)
    const ultimoDia = new Date(ano, mes + 1, 0)
    const diasAntes = primeiroDia.getDay()
    const diasNoMes = ultimoDia.getDate()

    const dias = []

    // Dias do mês anterior
    for (let i = diasAntes - 1; i >= 0; i--) {
      const dia = new Date(ano, mes, -i)
      dias.push({ dia: dia.getDate(), outroMes: true, data: dia })
    }

    // Dias do mês atual
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const data = new Date(ano, mes, dia)
      const dataString = data.toISOString().split("T")[0]
      const dadosDia = calendarioData[dataString] || { total: 0, status: "disponivel" }

      dias.push({
        dia,
        outroMes: false,
        data,
        dataString,
        ...dadosDia,
      })
    }

    // Completar com dias do próximo mês
    const diasRestantes = 42 - dias.length
    for (let dia = 1; dia <= diasRestantes; dia++) {
      const data = new Date(ano, mes + 1, dia)
      dias.push({ dia, outroMes: true, data })
    }

    return dias
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "disponivel":
        return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200"
      case "ocupado":
        return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200"
      case "lotado":
        return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200"
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
    }
  }

  const dias = obterDiasDoMes()

  return (
    <>
      {/* conteúdo da página de Calendário */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendário de Exames</h1>
            <p className="text-muted-foreground">Visualize e gerencie os exames agendados</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendário */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {meses[dataAtual.getMonth()]} {dataAtual.getFullYear()}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navegarMes(-1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navegarMes(1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {diasSemana.map((dia) => (
                    <div key={dia} className="p-2 text-center text-sm font-medium text-muted-foreground">
                      {dia}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {dias.map((diaInfo, index) => (
                    <button
                      key={index}
                      onClick={() => !diaInfo.outroMes && selecionarData(diaInfo.dia)}
                      disabled={diaInfo.outroMes}
                      className={`
                        p-2 text-sm rounded-lg transition-colors relative
                        ${
                          diaInfo.outroMes
                            ? "text-muted-foreground cursor-not-allowed"
                            : "hover:bg-accent cursor-pointer"
                        }
                        ${dataSelecionada === diaInfo.dataString ? "bg-primary text-primary-foreground" : ""}
                      `}
                    >
                      <div className="font-medium">{diaInfo.dia}</div>
                      {!diaInfo.outroMes && diaInfo.total > 0 && (
                        <div
                          className={`
                          absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center
                          ${getStatusColor(diaInfo.status)}
                        `}
                        >
                          {diaInfo.total}
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Disponível</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span>Ocupado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Lotado</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detalhes do dia selecionado */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {dataSelecionada ? "Exames do Dia" : "Selecione uma Data"}
                </CardTitle>
                {dataSelecionada && (
                  <CardDescription>
                    {new Date(dataSelecionada + "T00:00:00").toLocaleDateString("pt-BR", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {!dataSelecionada ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Clique em uma data no calendário para ver os exames agendados</p>
                  </div>
                ) : examesSelecionados.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum exame agendado para esta data</p>
                    <Button className="mt-4" size="sm" onClick={() => abrirModalAgendar()}>
                      Agendar Exame
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {examesSelecionados.map((exame) => (
                      <div key={exame.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{exame.paciente}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={exame.status === "confirmado" ? "default" : "secondary"}>
                              {exame.status}
                            </Badge>
                            {/* NOVO: botão para agendar para este paciente */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-transparent"
                              onClick={() => abrirModalAgendar(exame.paciente_id || exame.pacienteId || "")}
                              title="Agendar novo exame para este paciente"
                            >
                              Agendar
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>{exame.tipo}</p>
                          <p className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {exame.horario}
                          </p>
                        </div>
                      </div>
                    ))}

                    <Button className="w-full mt-4" size="sm" onClick={() => abrirModalAgendar()}>
                      Agendar Novo Exame
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* NOVO: Modal de Agendamento */}
      <Dialog open={agendarOpen} onOpenChange={setAgendarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar exame</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Data: {dataSelecionada ? new Date(dataSelecionada + "T00:00:00").toLocaleDateString("pt-BR") : "-"}
            </p>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <span className="text-sm font-medium">Paciente</span>
              <Select
                value={agendarForm.paciente}
                onValueChange={(v) => setAgendarForm((f) => ({ ...f, paciente: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {pacientesOptions.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nome} {p.cpf ? `- ${p.cpf}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <span className="text-sm font-medium">Tipo de exame</span>
              <Select
                value={agendarForm.tipo}
                onValueChange={(v) => setAgendarForm((f) => ({ ...f, tipo: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposOptions.map((t) => (
                    <SelectItem key={t.id || t.value || t} value={String(t.id || t.value || t)}>
                      {t.nome || t.label || t.value || t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <span className="text-sm font-medium">Horário</span>
              <Input
                type="time"
                value={agendarForm.hora}
                onChange={(e) => setAgendarForm((f) => ({ ...f, hora: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" className="bg-transparent" onClick={() => setAgendarOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarAgendamento} disabled={salvando}>
              {salvando ? "Salvando..." : "Agendar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
