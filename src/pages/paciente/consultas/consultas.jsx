import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Clock, Search, User, MapPin, Phone, Video, Stethoscope, CalendarPlus, Activity, FileText } from "lucide-react"
import { ProfileTabs } from "@/components/profile-tabs"
import { pacienteService } from "@/services/pacienteService"

export default function Consultas() {
  const [consultas, setConsultas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busca, setBusca] = useState("")
  const [filtro, setFiltro] = useState("todas")
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [consultaSelecionada, setConsultaSelecionada] = useState(null)

  const abrirDetalhes = (consulta) => {
    setConsultaSelecionada(consulta)
    setDetailsOpen(true)
  }

  useEffect(() => {
    let mounted = true

    const carregarConsultas = async () => {
      try {
        console.log('[DEBUG] Consultas - Iniciando carregamento...')
        
        const response = await pacienteService.getConsultas()
        console.log('[DEBUG] Consultas - Resposta da API:', response)
        
        if (!mounted) return

        // Normalizar dados da API
        let consultasData = []
        if (response.results) {
          console.log('[DEBUG] Consultas - Usando response.results')
          consultasData = response.results
        } else if (response.data?.results) {
          console.log('[DEBUG] Consultas - Usando response.data.results')
          consultasData = response.data.results
        } else if (response.data && Array.isArray(response.data)) {
          console.log('[DEBUG] Consultas - Usando response.data (array)')
          consultasData = response.data
        } else if (Array.isArray(response)) {
          console.log('[DEBUG] Consultas - Usando response direto (array)')
          consultasData = response
        }

        // Normalizar cada consulta
        const consultasNormalizadas = consultasData.map(consulta => {
          console.log('[DEBUG] Consultas - Consulta original:', consulta)
          
          const consultaNormalizada = {
            id: consulta.id,
            data: consulta.data || consulta.data_consulta,
            local: consulta.local || consulta.endereco || "Local não informado",
            tipo: consulta.tipo || consulta.tipo_consulta || "Presencial",
            status: consulta.status || "Agendada",
            medico: null
          }

          // Normalizar dados do médico
          if (consulta.medico) {
            if (typeof consulta.medico === 'object') {
              console.log('[DEBUG] Consultas - Médico como objeto:', consulta.medico)
              consultaNormalizada.medico = {
                id: consulta.medico.id,
                nome: consulta.medico.nome || consulta.medico.name || consulta.medico.usuario?.nome || consulta.medico.usuario?.name,
                especialidade: consulta.medico.especialidade || consulta.medico.specialty || "Especialidade não informada"
              }
            } else {
              console.log('[DEBUG] Consultas - Médico como string/ID:', consulta.medico)
              consultaNormalizada.medico = {
                id: consulta.medico,
                nome: "Médico não identificado",
                especialidade: "Especialidade não informada"
              }
            }
          } else if (consulta.medico_nome || consulta.doctor_name) {
            console.log('[DEBUG] Consultas - Médico por nome direto:', consulta.medico_nome || consulta.doctor_name)
            consultaNormalizada.medico = {
              id: consulta.medico_id || null,
              nome: consulta.medico_nome || consulta.doctor_name,
              especialidade: consulta.especialidade || consulta.specialty || "Especialidade não informada"
            }
          }

          console.log('[DEBUG] Consultas - Consulta normalizada:', consultaNormalizada)
          return consultaNormalizada
        })

        console.log('[DEBUG] Consultas - Todas as consultas normalizadas:', consultasNormalizadas)
        setConsultas(consultasNormalizadas)
      } catch (err) {
        if (!mounted) return
        console.error("Erro ao carregar consultas:", err)
        setError("Erro ao carregar consultas. Tente novamente.")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    carregarConsultas()

    return () => {
      mounted = false
    }
  }, [])

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

  // Separar consultas por período
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

  // Estatísticas das consultas
  const totalConsultas = consultas.length
  const consultasEsteAno = consultas.filter(c => c.data && new Date(c.data).getFullYear() === new Date().getFullYear()).length
  const proximasConsultas = consultasAgendadas.length
  const consultasConcluidas = consultasRealizadas.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-blue-900/10 dark:to-indigo-900/10">
      <div className="mx-auto w-full max-w-7xl space-y-8 p-6">
        {/* Cabeçalho Moderno */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                    <Calendar className="h-8 w-8" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">Minhas Consultas</h1>
                    <p className="text-blue-100">Gerencie suas consultas médicas</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  className="bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm dark:bg-gray-800/80 dark:hover:bg-gray-700/80 dark:border-gray-600/50 dark:text-gray-200"
                  asChild
                >
                  <a href="/paciente/medicos" className="inline-flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Médicos
                  </a>
                </Button>
                <Button 
                  className="bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-lg dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  asChild
                >
                  <a href="/paciente/consultas/nova" className="inline-flex items-center gap-2">
                    <CalendarPlus className="h-4 w-4" />
                    Agendar Consulta
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-blue-100 text-sm font-medium">Total de Consultas</p>
                  <p className="text-3xl font-bold">{totalConsultas}</p>
                </div>
                <div className="rounded-full bg-white/20 p-3">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-green-100 text-sm font-medium">Próximas Consultas</p>
                  <p className="text-3xl font-bold">{proximasConsultas}</p>
                </div>
                <div className="rounded-full bg-white/20 p-3">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-purple-100 text-sm font-medium">Consultas Concluídas</p>
                  <p className="text-3xl font-bold">{consultasConcluidas}</p>
                </div>
                <div className="rounded-full bg-white/20 p-3">
                  <Activity className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-orange-100 text-sm font-medium">Este Ano</p>
                  <p className="text-3xl font-bold">{consultasEsteAno}</p>
                </div>
                <div className="rounded-full bg-white/20 p-3">
                  <FileText className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <ProfileTabs tabs={pacienteTabs} basePath="/paciente" />

        {/* Filtros e Busca */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por médico, especialidade ou local..." 
                  className="pl-10 border-0 bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400" 
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Select value={filtro} onValueChange={setFiltro}>
                  <SelectTrigger className="w-[180px] border-0 bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
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
          </CardContent>
        </Card>

        <Tabs defaultValue="agendadas" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white dark:bg-gray-800 shadow-lg border-0">
            <TabsTrigger value="agendadas" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              Consultas Agendadas
            </TabsTrigger>
            <TabsTrigger value="realizadas" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              Histórico de Consultas
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="agendadas">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Calendar className="h-5 w-5" />
                  Próximas Consultas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="rounded-xl border p-4 space-y-3">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-1/4" />
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-3 w-fit mx-auto mb-4">
                      <Calendar className="h-8 w-8 text-red-500" />
                    </div>
                    <p className="text-red-500 font-medium">{error}</p>
                  </div>
                ) : consultasAgendadas.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="rounded-full bg-blue-100 dark:bg-blue-900/20 p-4 w-fit mx-auto mb-4">
                      <Calendar className="h-12 w-12 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Nenhuma consulta agendada
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                      Você não possui consultas agendadas no momento.
                    </p>
                    <Button 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg"
                      asChild
                    >
                      <a href="/paciente/consultas/nova" className="inline-flex items-center gap-2">
                        <CalendarPlus className="h-4 w-4" />
                        Agendar Nova Consulta
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {consultasAgendadas.map((c) => (
                      <div key={c.id} className="group relative overflow-hidden rounded-xl border-0 bg-gradient-to-r from-white to-blue-50/50 dark:from-gray-800 dark:to-blue-900/10 p-6 shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex-1 space-y-4">
                            <div className="flex items-start gap-4">
                              <div className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 p-3 text-white shadow-lg">
                                <User className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                                  <div>
                                    <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                                      {c.medico?.nome || "Médico não informado"}
                                    </h3>
                                    <p className="text-blue-600 dark:text-blue-400 font-medium">
                                      {c.medico?.especialidade || "Especialidade não informada"}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <Clock className="h-4 w-4" />
                                    <span className="font-medium">
                                      {c.data ? new Date(c.data).toLocaleDateString() : "Data não informada"} às {c.data ? new Date(c.data).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "--:--"}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="mt-3 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                  <MapPin className="h-4 w-4" />
                                  <span>{c.local}</span>
                                </div>
                                
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-1 text-xs font-medium text-white">
                                    {c.tipo === "Online" ? <Video className="h-3 w-3" /> : c.tipo === "Telefone" ? <Phone className="h-3 w-3" /> : <Stethoscope className="h-3 w-3" />}
                                    {c.tipo}
                                  </span>
                                  <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-300">
                                    {c.status || "—"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => abrirDetalhes(c)}
                              className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                            >
                              Ver Detalhes
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg"
                              asChild
                            >
                              <a href={`/paciente/consultas/nova${c.medico?.id ? `?medico=${c.medico.id}` : ""}`}>
                                Reagendar
                              </a>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="realizadas">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20">
                <CardTitle className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Clock className="h-5 w-5" />
                  Histórico de Consultas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-3 w-fit mx-auto mb-4">
                      <Clock className="h-8 w-8 text-red-500" />
                    </div>
                    <p className="text-red-500 font-medium">{error}</p>
                  </div>
                ) : consultasRealizadas.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 w-fit mx-auto mb-4">
                      <Clock className="h-12 w-12 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Você não possui consultas realizadas no histórico.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border-0 bg-white dark:bg-gray-800 shadow-lg">
                    <Table>
                      <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                        <TableRow className="border-0">
                          <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Data</TableHead>
                          <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Médico</TableHead>
                          <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Especialidade</TableHead>
                          <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Tipo</TableHead>
                          <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Status</TableHead>
                          <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {consultasRealizadas.map((c) => (
                          <TableRow key={c.id} className="border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <TableCell className="font-medium">
                              {c.data ? new Date(c.data).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell>{c.medico?.nome || "—"}</TableCell>
                            <TableCell>{c.medico?.especialidade || "—"}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                                {c.tipo === "Online" ? <Video className="h-3 w-3" /> : c.tipo === "Telefone" ? <Phone className="h-3 w-3" /> : <Stethoscope className="h-3 w-3" />}
                                {c.tipo || "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300">
                                {c.status || "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => abrirDetalhes(c)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                              >
                                Ver Detalhes
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Detalhes da Consulta */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl border-0 shadow-2xl">
            <DialogHeader className="pb-6">
              <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Detalhes da Consulta
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400">
                Informações completas da consulta selecionada
              </DialogDescription>
            </DialogHeader>

            {consultaSelecionada ? (
              <div className="space-y-6">
                {/* Cabeçalho com avatar + info do médico */}
                <div className="flex items-start gap-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-lg shadow-lg">
                    {(consultaSelecionada.medico?.nome || "—")
                      .split(" ")
                      .map((p) => p?.[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100">
                      {consultaSelecionada.medico?.nome || "—"}
                    </h3>
                    <p className="text-blue-600 dark:text-blue-400 font-medium">
                      {consultaSelecionada.medico?.especialidade || "Especialidade não informada"}
                    </p>
                  </div>
                </div>

                {/* Grid de informações principais */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Data</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {consultaSelecionada.data ? new Date(consultaSelecionada.data).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Hora</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {consultaSelecionada.data
                        ? new Date(consultaSelecionada.data).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-1 text-sm font-medium text-white">
                      {consultaSelecionada.tipo === "Online" ? <Video className="h-3 w-3" /> : consultaSelecionada.tipo === "Telefone" ? <Phone className="h-3 w-3" /> : <Stethoscope className="h-3 w-3" />}
                      {consultaSelecionada.tipo}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                    <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-sm font-medium text-green-700 dark:text-green-300">
                      {consultaSelecionada.status}
                    </span>
                  </div>
                </div>

                {/* Local da consulta */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Local</p>
                  <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{consultaSelecionada.local}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}