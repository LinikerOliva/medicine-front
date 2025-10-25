// filepath: c:\Users\linik\OneDrive\Área de Trabalho\tcc-front\medicine-front\src\pages\paciente\consultas\consultas.jsx
import { useEffect, useState } from "react"
import { pacienteService } from "@/services/pacienteService"
import { ProfileTabs } from "@/components/profile-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { 
  ClipboardList, 
  Download, 
  Eye, 
  Search, 
  Calendar,
  FileText,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Stethoscope
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import api from "@/services/api"

export default function PacienteExames() {
  const [exames, setExames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtro, setFiltro] = useState("todas")
  const [busca, setBusca] = useState("")

  // Helpers de mapeamento (nome do exame, médico e URL de resultado)
  const getExamName = (ex) =>
    ex?.tipo_exame?.nome ||
    ex?.tipo_exame_nome ||
    ex?.nome_exame ||
    (typeof ex?.tipo_exame === "string" ? ex.tipo_exame : null) ||
    ex?.nome ||
    ex?.tipo ||
    ex?.exame ||
    "Exame"

  const getDoctorName = (med) => {
    const user = med?.user
    const full = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim()
    return full || user?.nome || user?.username || med?.nome || "—"
  }

  const getResultUrl = (ex) => {
    const url = ex?.resultado_url || ex?.arquivo_resultado || ex?.resultado?.arquivo || ex?.arquivo_url || ex?.documento_url
    if (!url) return null
    if (/^https?:\/\//i.test(url)) return url
    const base = import.meta.env.VITE_API_URL || "http://localhost:8000"
    return `${base}${url.startsWith("/") ? "" : "/"}${url}`
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await pacienteService.getExames()
        if (mounted) {
          const examesData = Array.isArray(data) ? data : data?.results || []
          const mapeados = examesData.map((e) => ({
            id: e.id,
            data: e.data_agendamento || e.data_solicitacao || e.data || e.data_hora || null,
            nome: getExamName(e),
            medico: { nome: getDoctorName(e?.medico_solicitante || e?.medico) },
            status: e.status || e.situacao || "Pendente",
            local: e.local_realizacao || e.local || e.localizacao || e.unidade || "",
            resultado_url: getResultUrl(e),
          }))
          setExames(mapeados)
        }
      } catch (e) {
        setError("Não foi possível carregar os exames.")
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

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

  // Filtro de texto e status
  const examesFiltrados = exames.filter((e) => {
    if (filtro === "agendados") {
      const isFuture = e.data ? new Date(e.data) > new Date() : false
      if (!isFuture && (e.status || "").toLowerCase().includes("conclu")) return false
      if (!isFuture && (e.status || "").toLowerCase() === "realizado") return false
    }
    if (filtro === "realizados") {
      const isDone =
        (e.status || "").toLowerCase().includes("conclu") ||
        (e.status || "").toLowerCase() === "realizado" ||
        (e.data ? new Date(e.data) < new Date() : false)
      if (!isDone) return false
    }
    if (busca) {
      const term = busca.toLowerCase()
      return (
        (e.nome || "").toLowerCase().includes(term) ||
        (e.medico?.nome || "").toLowerCase().includes(term) ||
        (e.local || "").toLowerCase().includes(term)
      )
    }
    return true
  })

  const examesAgendados = examesFiltrados
    .filter((e) => {
      const isFuture = e.data ? new Date(e.data) > new Date() : false
      const status = (e.status || "").toLowerCase()
      return isFuture || status === "agendado" || status === "pendente" || status === "solicitado"
    })
    .sort((a, b) => new Date(a.data || 0) - new Date(b.data || 0))

  const examesRealizados = examesFiltrados
    .filter((e) => {
      const status = (e.status || "").toLowerCase()
      const isPast = e.data ? new Date(e.data) < new Date() : false
      return isPast || status.includes("conclu") || status === "realizado"
    })
    .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0))

  // Calcular estatísticas
  const totalExames = exames.length
  const proximosExames = examesAgendados.length
  const examesConcluidos = examesRealizados.length
  const examesEsteAno = exames.filter(e => {
    if (!e.data) return false
    const examYear = new Date(e.data).getFullYear()
    return examYear === new Date().getFullYear()
  }).length

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-6">
      {/* Header moderno */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-medical-primary/90 via-medical-primary to-medical-secondary p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                  <ClipboardList className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Meus Exames</h1>
                  <p className="text-white/90">Gerencie seus exames e resultados</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="secondary" 
                className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
              >
                <Stethoscope className="mr-2 h-4 w-4" />
                Médicos
              </Button>
              <Button 
                variant="secondary"
                className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Agendar Exame
              </Button>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white/10"></div>
        <div className="absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-white/10"></div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-medical-primary/80 to-medical-primary text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-white/90 text-sm font-medium">Total de Exames</p>
                <p className="text-3xl font-bold">{totalExames}</p>
              </div>
              <div className="rounded-full bg-white/20 p-3">
                <FileText className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10"></div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-status-attention/80 to-status-attention text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-white/90 text-sm font-medium">Próximos Exames</p>
                <p className="text-3xl font-bold">{proximosExames}</p>
              </div>
              <div className="rounded-full bg-white/20 p-3">
                <Clock className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10"></div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-medical-secondary/80 to-medical-secondary text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-white/90 text-sm font-medium">Concluídos</p>
                <p className="text-3xl font-bold">{examesConcluidos}</p>
              </div>
              <div className="rounded-full bg-white/20 p-3">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10"></div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-medical-primary/60 to-medical-primary/80 text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-white/90 text-sm font-medium">Este Ano</p>
                <p className="text-3xl font-bold">{examesEsteAno}</p>
              </div>
              <div className="rounded-full bg-white/20 p-3">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10"></div>
          </CardContent>
        </Card>
      </div>

      <ProfileTabs tabs={pacienteTabs} basePath="/paciente" />

      {/* Filtros */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por exame, médico ou local..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full md:w-[220px]">
              <Select value={filtro} onValueChange={setFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todos os exames</SelectItem>
                  <SelectItem value="agendados">Agendados</SelectItem>
                  <SelectItem value="realizados">Realizados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="agendados" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50">
          <TabsTrigger value="agendados" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Clock className="mr-2 h-4 w-4" />
            Exames Agendados
          </TabsTrigger>
          <TabsTrigger value="realizados" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Histórico de Exames
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agendados" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Clock className="h-5 w-5 text-amber-500" />
                Próximos Exames
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="rounded-lg border p-4">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-2" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-500 font-medium">{error}</p>
                </div>
              ) : examesAgendados.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">Nenhum exame agendado</h3>
                  <p className="text-muted-foreground">Você não possui exames agendados no momento.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {examesAgendados.map((e) => (
                    <div key={e.id || `${e.data}-${e.nome}`} className="group rounded-xl border border-border/50 bg-gradient-to-r from-background to-muted/20 p-6 transition-all hover:shadow-lg hover:border-border">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                                {e.nome}
                              </h3>
                              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                                <Stethoscope className="h-4 w-4" />
                                {e.medico?.nome || "—"}
                              </p>
                            </div>
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                              {e.status}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {e.data ? new Date(e.data).toLocaleDateString() : "—"}{" "}
                                {e.data ? `às ${new Date(e.data).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                              </span>
                            </div>
                            {e.local && (
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                <span>{e.local}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realizados" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Histórico de Exames
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-500 font-medium">{error}</p>
                </div>
              ) : examesRealizados.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">Nenhum exame no histórico</h3>
                  <p className="text-muted-foreground">Você não possui exames realizados no histórico.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50">
                        <TableHead className="font-semibold">Data</TableHead>
                        <TableHead className="font-semibold">Exame</TableHead>
                        <TableHead className="font-semibold">Médico</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {examesFiltrados.map((e) => (
                        <TableRow key={e.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium">
                            {e.data ? new Date(e.data).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{e.nome}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Stethoscope className="h-4 w-4 text-muted-foreground" />
                              {e.medico?.nome || "—"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                (e.status || "").toLowerCase().includes("conclu") || (e.status || "").toLowerCase() === "realizado"
                                  ? "default"
                                  : "secondary"
                              }
                              className={
                                (e.status || "").toLowerCase().includes("conclu") || (e.status || "").toLowerCase() === "realizado"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                              }
                            >
                              {e.status || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              {e.resultado_url ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="group border-emerald-500/60 bg-gradient-to-b from-emerald-500/10 to-emerald-600/10 text-emerald-700 hover:from-emerald-500/20 hover:to-emerald-600/20 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-100"
                                    onClick={() => window.open(e.resultado_url, '_blank')}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Ver
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="group border-blue-500/60 bg-gradient-to-b from-blue-500/10 to-blue-600/10 text-blue-700 hover:from-blue-500/20 hover:to-blue-600/20 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                                    onClick={() => void handleDownloadFile(e)}
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    Baixar
                                  </Button>
                                </>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">Sem resultado</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled
                                    className="opacity-50 cursor-not-allowed"
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    Baixar
                                  </Button>
                                </div>
                              )}
                            </div>
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
    </div>
  )
}

// Baixar resultado com autenticação (função utilitária)
const handleDownloadFile = async (item) => {
  try {
    let url = item?.resultado_url
    if (!url) return
    if (!/^https?:\/\//i.test(url)) {
      const base = import.meta.env.VITE_API_URL || "http://localhost:8000"
      url = `${base}${url.startsWith("/") ? "" : "/"}${url}`
    }
    const res = await api.get(url, { responseType: "blob", baseURL: "" })
    const blob = new Blob([res.data], { type: res.headers["content-type"] || "application/octet-stream" })
    const cd = res.headers["content-disposition"] || ""
    const match = /filename\*=UTF-8''([^;]+)|filename="?([^\";]+)"?/i.exec(cd)
    const filename = decodeURIComponent(match?.[1] || match?.[2] || `${item.nome || "resultado"}.pdf`)
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    // Adiar revoke para evitar erro de rede durante download
    setTimeout(() => URL.revokeObjectURL(link.href), 2000)
  } catch (err) {
    console.warn("[Exames] download falhou:", err?.response?.status)
    alert("Não foi possível baixar o resultado. Tente novamente.")
  }
}
