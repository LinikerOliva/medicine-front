"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, User, CheckCircle2, XCircle } from "lucide-react"
import { ProfileTabs } from "@/components/profile-tabs"
import { useToast } from "@/hooks/use-toast"
import { medicoService } from "@/services/medicoService"
import { secretariaService } from "@/services/secretariaService"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

export default function SolicitacoesMedico() {
  const [loading, setLoading] = useState(true)
  const [solicitacoes, setSolicitacoes] = useState([])
  const [statusFiltro, setStatusFiltro] = useState("pendente")
  const { toast } = useToast()
  const [selected, setSelected] = useState(null)
  const pad = (n) => String(n).padStart(2, "0")
  const todayIso = (() => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` })()
  const [agendaDate, setAgendaDate] = useState(todayIso)
  const [agendaConsultas, setAgendaConsultas] = useState([])
  const [agendaLoading, setAgendaLoading] = useState(false)
  const [modalPropor, setModalPropor] = useState(false)
  const [modalReagendar, setModalReagendar] = useState(false)
  const [horaInput, setHoraInput] = useState("")

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const mid = await medicoService._resolveMedicoId().catch(() => null)
        const sols = await secretariaService.listarSolicitacoesHoje(mid)
        const list = Array.isArray(sols) ? sols : []
        const normalized = list.map((s) => {
          const dataHora = s.data_hora || s.inicio || s.horario || null
          const dataStr = s.data || s.dia || (typeof dataHora === 'string' ? dataHora.slice(0,10) : null)
          const horaStr = s.hora || s.horario || (typeof dataHora === 'string' ? (dataHora.match(/T(\d{2}:\d{2})/)?.[1] || null) : null)
          return {
            id: s.id,
            paciente: s.paciente?.nome || (s.paciente?.user ? `${s.paciente.user.first_name || ''} ${s.paciente.user.last_name || ''}`.trim() : 'Paciente'),
            dataStr,
            horaStr,
            dataHora: (dataStr && horaStr) ? `${dataStr}T${horaStr}:00` : dataHora,
            tipo: s.tipo || s.modalidade || 'consulta',
            status: String(s.status || s.situacao || 'pendente').toLowerCase(),
            raw: s,
          }
        })
        if (mounted) setSolicitacoes(normalized)
      } catch (e) {}
      finally { if (mounted) setLoading(false) }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const d = selected?.dataHora ? new Date(selected.dataHora) : null
    if (d && !isNaN(d)) {
      const s = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
      setAgendaDate(s)
    }
  }, [selected?.dataHora])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!agendaDate) return
      setAgendaLoading(true)
      try {
        const res = await medicoService.getConsultasDoMedico({ date: agendaDate })
        const list = Array.isArray(res) ? res : (Array.isArray(res?.results) ? res.results : [])
        if (mounted) setAgendaConsultas(list)
      } catch { if (mounted) setAgendaConsultas([]) }
      finally { if (mounted) setAgendaLoading(false) }
    })()
    return () => { mounted = false }
  }, [agendaDate])

  const tabs = useMemo(() => ([
    { label: "Dashboard", href: "/medico/dashboard" },
    { label: "Consultas de Hoje", href: "/medico/consultas/hoje" },
    { label: "Meus Pacientes", href: "/medico/meus-pacientes" },
    { label: "Solicitações", href: "/medico/solicitacoes" },
  ]), [])

  const filtered = useMemo(() => {
    const s = String(statusFiltro || "").toLowerCase()
    if (!s || s === "todas") return solicitacoes
    return solicitacoes.filter((c) => String(c.status || "").toLowerCase() === s)
  }, [solicitacoes, statusFiltro])

  const confirmar = async (id) => {
    const item = solicitacoes.find((x) => x.id === id)
    const raw = item?.raw || {}
    const relatedId = raw.consulta?.id || raw.consulta_id || raw.agendamento?.id || raw.agendamento_id || raw.id
    try {
      await secretariaService.aceitarSolicitacao(id)
      setSolicitacoes((prev) => prev.map((c) => (c.id === id ? { ...c, status: "confirmada" } : c)))
      toast({ title: "Solicitação confirmada" })
    } catch (_) {
      try {
        if (relatedId && relatedId !== id) {
          await secretariaService.confirmarConsulta(relatedId)
          setSolicitacoes((prev) => prev.map((c) => (c.id === id ? { ...c, status: "confirmada" } : c)))
          toast({ title: "Solicitação confirmada" })
          return
        }
        throw new Error("Falha")
      } catch (e2) {
        toast({ title: "Erro", description: "Falha ao confirmar", variant: "destructive" })
      }
    }
  }
  const cancelar = async (id) => {
    const item = solicitacoes.find((x) => x.id === id)
    const raw = item?.raw || {}
    const relatedId = raw.consulta?.id || raw.consulta_id || raw.agendamento?.id || raw.agendamento_id || raw.id
    try {
      await secretariaService.cancelarSolicitacao(id)
      setSolicitacoes((prev) => prev.map((c) => (c.id === id ? { ...c, status: "cancelada" } : c)))
      toast({ title: "Solicitação cancelada" })
    } catch (_) {
      try {
        if (relatedId && relatedId !== id) {
          await secretariaService.cancelarConsulta(relatedId, "cancelado pelo médico/secretaria")
          setSolicitacoes((prev) => prev.map((c) => (c.id === id ? { ...c, status: "cancelada" } : c)))
          toast({ title: "Solicitação cancelada" })
          return
        }
        throw new Error("Falha")
      } catch (e2) {
        toast({ title: "Erro", description: "Falha ao cancelar", variant: "destructive" })
      }
    }
  }

  const proporEnvio = async () => {
    if (!selected) return
    const day = agendaDate
    const iso = horaInput && /^\d{2}:\d{2}$/.test(horaInput) ? `${day}T${horaInput}:00` : `${day}T00:00:00`
    try {
      await secretariaService.proporNovaData(selected.id, iso)
      setSolicitacoes((prev) => prev.map((c) => (c.id === selected.id ? { ...c, status: "aguardando_paciente", dataHora: iso, dataStr: day, horaStr: horaInput } : c)))
      setModalPropor(false)
      toast({ title: "Contraproposta enviada", description: "Aguardando resposta do paciente" })
    } catch { toast({ title: "Erro", description: "Falha ao propor nova data", variant: "destructive" }) }
  }

  const reagendarEnvio = async () => {
    if (!selected) return
    const day = agendaDate
    const iso = horaInput && /^\d{2}:\d{2}$/.test(horaInput) ? `${day}T${horaInput}:00` : `${day}T00:00:00`
    try {
      await secretariaService.reagendarConsulta(selected.id, iso)
      setSolicitacoes((prev) => prev.map((c) => (c.id === selected.id ? { ...c, status: "confirmada", dataHora: iso, dataStr: day, horaStr: horaInput } : c)))
      setModalReagendar(false)
      toast({ title: "Consulta reagendada" })
    } catch { toast({ title: "Erro", description: "Falha ao reagendar", variant: "destructive" }) }
  }

  const slots = useMemo(() => {
    const out = []
    for (let h = 8; h < 18; h++) out.push(`${String(h).padStart(2, "0")}:00`)
    return out
  }, [])

  const ocupado = (hhmm) => {
    const m = agendaConsultas || []
    return m.some((c) => {
      const s = String(c?.hora || c?.horario || c?.data_hora || "")
      const mm = (s.match(/(\d{2}:\d{2})/) || s.match(/T(\d{2}:\d{2})/))?.[1]
      return mm === hhmm
    })
  }

  const normStatus = (s) => String(s || "").toLowerCase()
  const displayStatus = (s) => {
    const v = normStatus(s)
    if (v.includes("aguardando_paciente")) return "Aguardando paciente"
    if (v.includes("confirm")) return "Confirmada"
    if (v.includes("cancel")) return "Cancelada"
    if (v.includes("agend")) return "Agendada"
    if (v.includes("pendente")) return "Agendada"
    return s
  }

  const buildDateTimeDisplay = (val, dateStrFallback, timeStrFallback) => {
    const dt = val ? new Date(val) : null
    const hasTime = Boolean(timeStrFallback) || (dt && !isNaN(dt.getTime()))
    const datePart = dt && !isNaN(dt.getTime()) ? dt.toLocaleDateString('pt-BR') : (dateStrFallback ? new Date(`${dateStrFallback}T00:00:00`).toLocaleDateString('pt-BR') : '—')
    const timePart = (() => {
      if (timeStrFallback) return timeStrFallback
      if (dt && !isNaN(dt.getTime())) return dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      return '—'
    })()
    return `${datePart}${hasTime ? ` ${timePart}` : ''}`
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Solicitações de Consultas</h1>
      <ProfileTabs tabs={tabs} basePath="/medico" />

      <Card>
        <CardHeader>
          <CardTitle>Solicitações de Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-3">
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="confirmada">Confirmadas</SelectItem>
                <SelectItem value="cancelada">Canceladas</SelectItem>
                <SelectItem value="aguardando_paciente">Aguardando paciente</SelectItem>
                <SelectItem value="todas">Todas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : filtered.length === 0 ? (
            <div className="text-muted-foreground">Nenhuma solicitação encontrada.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} onClick={() => setSelected(c)} className={selected?.id===c.id?"bg-muted/30 cursor-pointer":"cursor-pointer"}>
                      <TableCell>{c.paciente}</TableCell>
                      <TableCell>{c.tipo}</TableCell>
                      <TableCell>{buildDateTimeDisplay(c.dataHora, c.dataStr, c.horaStr)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{displayStatus(c.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {( ["pendente","agendada"] ).includes(c.status) && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button aria-label="Confirmar" size="icon-sm" variant="success" onClick={() => confirmar(c.id)}>
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Confirmar</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {( ["pendente", "agendada", "confirmada", "confirmado"] ).includes(c.status) && (
                            <Button size="sm" variant="destructive" onClick={() => cancelar(c.id)}>
                              <XCircle className="h-4 w-4 mr-1" /> Cancelar
                            </Button>
                          )}
                          <TooltipProvider>
                            {( ["pendente","agendada"] ).includes(c.status) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button aria-label="Propor nova data" size="icon-sm" variant="info" onClick={() => { setSelected(c); setModalPropor(true) }}>
                                    <Calendar className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Propor nova data</TooltipContent>
                              </Tooltip>
                            )}
                            {( ["confirmada","confirmado"] ).includes(c.status) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button aria-label="Reagendar" size="icon-sm" variant="info" onClick={() => { setSelected(c); setModalReagendar(true) }}>
                                    <Calendar className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reagendar</TooltipContent>
                              </Tooltip>
                            )}
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Card>
                <CardHeader>
                  <CardTitle>Agenda do dia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-3">
                    <DatePicker value={agendaDate} onChange={setAgendaDate} />
                  </div>
                  {agendaLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : (
                    <div className="divide-y border rounded">
                      {slots.map((hhmm) => (
                        <div
                          key={hhmm}
                          className={`flex items-center justify-between px-3 py-2 ${ocupado(hhmm)?"bg-red-50 text-red-700 cursor-not-allowed":"cursor-pointer hover:bg-muted/30"}`}
                          onClick={() => {
                            if (!selected || ocupado(hhmm)) return
                            setHoraInput(hhmm)
                            const v = normStatus(selected.status)
                            if (v.includes("confirm")) setModalReagendar(true)
                            else setModalPropor(true)
                          }}
                          role="button"
                          aria-disabled={ocupado(hhmm)}
                        >
                          <span className="text-sm">{hhmm}</span>
                          <span className="text-xs text-muted-foreground">{ocupado(hhmm)?"Ocupado":"Livre"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalPropor} onOpenChange={setModalPropor}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Propor nova data</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <DatePicker value={agendaDate} onChange={setAgendaDate} />
            <Input placeholder="HH:MM" value={horaInput} onChange={(e)=>setHoraInput(e.target.value)} />
            <div className="text-xs text-muted-foreground">Dica: clique em um horário livre na agenda ao lado para preencher automaticamente.</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setModalPropor(false)}>Cancelar</Button>
            <Button onClick={proporEnvio}>Enviar contraproposta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalReagendar} onOpenChange={setModalReagendar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reagendar consulta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <DatePicker value={agendaDate} onChange={setAgendaDate} />
            <Input placeholder="HH:MM" value={horaInput} onChange={(e)=>setHoraInput(e.target.value)} />
            <div className="text-xs text-muted-foreground">Selecione um horário livre na agenda ao lado.</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setModalReagendar(false)}>Cancelar</Button>
            <Button onClick={reagendarEnvio}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
