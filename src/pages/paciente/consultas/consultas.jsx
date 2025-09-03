import { useEffect, useState } from "react"
import { pacienteService } from "@/services/pacienteService"
import { ProfileTabs } from "@/components/profile-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Search, Filter, Clock, User, MapPin } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

export default function PacienteConsultas() {
  const [consultas, setConsultas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtro, setFiltro] = useState("todas")
  const [busca, setBusca] = useState("")

  // Estados do painel de detalhes
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [consultaSelecionada, setConsultaSelecionada] = useState(null)

  // Abrir painel de detalhes
  const abrirDetalhes = (c) => {
    setConsultaSelecionada(c)
    setDetailsOpen(true)
  }

  // Helper para especialidade (evita "[object Object]")
  const getDoctorSpecialty = (m) => {
    const tryFromObj = (obj) =>
      obj?.nome || obj?.titulo || obj?.name || obj?.descricao || obj?.description

    if (Array.isArray(m?.especialidades) && m.especialidades.length) {
      const parts = m.especialidades
        .map((x) => tryFromObj(x) || (typeof x === "string" ? x : null))
        .filter(Boolean)
      if (parts.length) return parts.join(", ")
    }
    if (m?.especialidade && typeof m.especialidade === "object") {
      const v = tryFromObj(m.especialidade)
      if (v) return v
    }
    if (typeof m?.especialidade === "string" && m.especialidade.trim()) return m.especialidade.trim()
    if (typeof m?.especialidade_nome === "string" && m.especialidade_nome.trim()) return m.especialidade_nome.trim()
    if (typeof m?.specialty === "string" && m.specialty.trim()) return m.specialty.trim()
    if (typeof m?.area === "string" && m.area.trim()) return m.area.trim()
    if (typeof m?.user?.especialidade === "string" && m.user.especialidade.trim()) return m.user.especialidade.trim()
    return "Não especificada"
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await pacienteService.getConsultas()
        if (mounted) {
          const consultasData = Array.isArray(data) ? data : data?.results || []

          const consultasMapeadas = consultasData.map((c) => {
            const first = c.medico?.user?.first_name || c.medico?.first_name || c.medico?.nome || ""
            const last = c.medico?.user?.last_name || c.medico?.last_name || ""
            const nomeMedico = [first, last].filter(Boolean).join(" ").trim() || c.medico?.nome || "—"
            const especialidadeStr = getDoctorSpecialty(c.medico || {})

            return {
              id: c.id,
              data: c.data || c.data_hora,
              medico: {
                id: c.medico?.id || c.medico_id,
                nome: nomeMedico,
                especialidade: especialidadeStr,
                crm: c.medico?.crm || c.medico?.crm_numero || c.crm || null,
                email: c.medico?.email || c.medico?.user?.email || null,
                telefone: c.medico?.telefone || c.medico?.celular || c.medico?.user?.phone || null,
                raw: c.medico || null,
              },
              status: c.status,
              local: c.local || c.localizacao || "Local não especificado",
              tipo: c.tipo || c.motivo || "Consulta",
              observacoes: c.observacoes || c.descricao || "",
              // Inclusão de medicamentos/prescrição
              medicamentos: c.medicamentos || c.medicacoes || c.prescricao?.medicamentos || c.receita?.medicamentos || [],
              prescricao: c.prescricao || c.receita || null,
              raw: c,
            }
          })

          setConsultas(consultasMapeadas)
        }
      } catch (e) {
        if (mounted) setError("Não foi possível carregar as consultas.")
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  // Removido: consultasDemo e fallback
  // Filtrar consultas
  const consultasFiltradas = consultas.filter(c => {
    const st = String(c.status || "").toLowerCase()
    if (filtro === "agendadas" && !(st.includes("agend") || st.includes("confirm"))) return false
    if (filtro === "realizadas" && !(st.includes("conclu") || st.includes("realiz") || st.includes("final"))) return false

    if (busca) {
      const termoBusca = busca.toLowerCase()
      return (
        c.medico?.nome?.toLowerCase().includes(termoBusca) ||
        c.medico?.especialidade?.toLowerCase?.().includes(termoBusca) ||
        c.local?.toLowerCase().includes(termoBusca) ||
        c.tipo?.toLowerCase().includes(termoBusca)
      )
    }
    return true
  })

  // Separar consultas por período – lógica mais tolerante
  const agora = new Date()
  const consultasAgendadas = consultasFiltradas
    .filter((c) => {
      const st = (c.status || "").toLowerCase()
      const isAgendada = st.includes("agend") || st.includes("confirm")
      const isFutura = c.data ? new Date(c.data) > agora : false
      return isAgendada || isFutura
    })
    .sort((a, b) => new Date(a.data) - new Date(b.data))

  const consultasRealizadas = consultasFiltradas
    .filter((c) => {
      const st = (c.status || "").toLowerCase()
      const isRealizada = st.includes("conclu") || st.includes("realiz") || st.includes("final")
      const isPassada = c.data ? new Date(c.data) < agora : false
      return isRealizada || isPassada
    })
    .sort((a, b) => new Date(b.data) - new Date(a.data))

  const pacienteTabs = [
    { label: "Resumo", href: "/paciente/perfil" },
    { label: "Prontuário", href: "/paciente/prontuario" },
    { label: "Consultas", href: "/paciente/consultas" },
    { label: "Exames", href: "/paciente/exames" },
    { label: "Receitas", href: "/paciente/receitas" },
    { label: "Histórico Médico", href: "/paciente/historico-medico" },
    { label: "Médicos Vinculados", href: "/paciente/medicos" },
    { label: "Configurações", href: "/paciente/configuracoes" },
  ]

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Minhas Consultas</h1>
        </div>
        <Button variant="outline" asChild className="app-cta-btn">
          <a href="/paciente/consultas/nova" aria-label="Agendar Nova Consulta" className="inline-flex items-center">
            <span className="icon-pill">
              <Calendar className="h-4 w-4" />
            </span>
            <span className="font-semibold tracking-tight">Agendar Nova Consulta</span>
          </a>
        </Button>
      </div>

      <ProfileTabs tabs={pacienteTabs} basePath="/paciente" />

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por médico, especialidade ou local..." 
            className="pl-10" 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as consultas</SelectItem>
              <SelectItem value="agendadas">Agendadas</SelectItem>
              <SelectItem value="realizadas">Realizadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="agendadas" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="agendadas">Consultas Agendadas</TabsTrigger>
          <TabsTrigger value="realizadas">Histórico de Consultas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="agendadas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Próximas Consultas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : error ? (
                <p className="text-sm text-red-500">{error}</p>
              ) : consultasAgendadas.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-medium">Nenhuma consulta agendada</h3>
                  <p className="text-sm text-muted-foreground mt-1">Você não possui consultas agendadas no momento.</p>
                  <Button className="mt-4 app-cta-btn" variant="outline" asChild>
                    <a href="/paciente/consultas/nova" aria-label="Agendar Nova Consulta" className="inline-flex items-center">
                      <span className="icon-pill">
                        <Calendar className="h-4 w-4" />
                      </span>
                      <span className="font-semibold tracking-tight">Agendar Nova Consulta</span>
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {consultasAgendadas.map((c) => (
                    <div key={c.id} className="flex flex-col md:flex-row gap-4 border rounded-lg p-4 bg-app-soft dark:bg-background">
                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            <div>
                              <p className="font-medium">{c.medico?.nome}</p>
                              <p className="text-sm text-muted-foreground">{c.medico?.especialidade}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm">
                              {new Date(c.data).toLocaleDateString()} às {new Date(c.data).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-2">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <p className="text-sm">{c.local}</p>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full px-2 py-1 text-xs bg-primary/10 text-primary">
                            {c.tipo}
                          </span>
                          <span className="rounded-full px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            {c.status || "—"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => abrirDetalhes(c)}>
                          Ver Detalhes
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/paciente/consultas/nova${c.medico?.id ? `?medico=${c.medico.id}` : ""}`}>Reagendar</a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="realizadas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Histórico de Consultas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : error ? (
                <p className="text-sm text-red-500">{error}</p>
              ) : consultasRealizadas.length === 0 ? (
                <div className="text-sm text-muted-foreground">Você não possui consultas realizadas no histórico.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Médico</TableHead>
                      <TableHead>Especialidade</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consultasRealizadas.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{new Date(c.data).toLocaleDateString()}</TableCell>
                        <TableCell>{c.medico?.nome || c.medico || "—"}</TableCell>
                        <TableCell>{c.medico?.especialidade || c.especialidade || "—"}</TableCell>
                        <TableCell>{c.tipo || "—"}</TableCell>
                        <TableCell>
                          <span className="rounded-full px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            {c.status || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => abrirDetalhes(c)}>
                            Ver Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes da Consulta */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Consulta</DialogTitle>
            <DialogDescription>Informações completas da consulta selecionada</DialogDescription>
          </DialogHeader>

          {consultaSelecionada ? (
            <div className="px-6 pb-4 space-y-6">
              {/* Cabeçalho com avatar + info do médico */}
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                  {(consultaSelecionada.medico?.nome || "—")
                    .split(" ")
                    .map((p) => p?.[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-base">{consultaSelecionada.medico?.nome || "—"}</p>
                  <p className="text-sm text-muted-foreground">
                    {consultaSelecionada.medico?.especialidade || "Especialidade não informada"}
                  </p>
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Grid de informações principais */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {consultaSelecionada.data ? new Date(consultaSelecionada.data).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Hora</p>
                  <p className="font-medium">
                    {consultaSelecionada.data
                      ? new Date(consultaSelecionada.data).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <span className="inline-block rounded-full px-2 py-1 text-xs bg-primary/10 text-primary">
                    {consultaSelecionada.tipo || "—"}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <span className="inline-block rounded-full px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                    {consultaSelecionada.status || "—"}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Local</p>
                <p className="text-sm">{consultaSelecionada.local || "—"}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Observações</p>
                <div className="rounded-md bg-muted/40 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {consultaSelecionada.observacoes || "—"}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Medicamentos</p>
                {(() => {
                  const raw =
                    consultaSelecionada.medicamentos ??
                    consultaSelecionada.prescricao?.medicamentos
                  const list = Array.isArray(raw)
                    ? raw
                    : typeof raw === "string"
                    ? raw.split(",").map((s) => s.trim()).filter(Boolean)
                    : []

                  return list.length ? (
                    <div className="flex flex-wrap gap-2">
                      {list.map((x, i) => {
                        const label =
                          typeof x === "string"
                            ? x
                            : x?.nome ||
                              x?.medicamento ||
                              x?.nome_medicamento ||
                              [x?.descricao, x?.dose || x?.dosagem, x?.posologia || x?.frequencia]
                                .filter(Boolean)
                                .join(" • ") ||
                              JSON.stringify(x)
                        return (
                          <span key={i} className="rounded-full px-2.5 py-1 text-xs bg-muted text-foreground">
                            {label}
                          </span>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )
                })()}
              </div>

              <DialogFooter>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setDetailsOpen(false)}
                >
                  Fechar
                </button>
              </DialogFooter>
            </div>
          ) : (
            <div className="px-6 pb-6 text-sm text-muted-foreground">Selecione uma consulta para ver os detalhes.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}