// filepath: c:\Users\linik\OneDrive\Área de Trabalho\tcc-front\medicine-front\src\pages\paciente\consultas\consultas.jsx
import { useEffect, useState } from "react"
import { pacienteService } from "@/services/pacienteService"
import { ProfileTabs } from "@/components/profile-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { ClipboardList, Download, Eye } from "lucide-react"
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

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5" />
        <h1 className="text-2xl font-bold tracking-tight">Meus Exames</h1>
      </div>

      <ProfileTabs tabs={pacienteTabs} basePath="/paciente" />

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar por exame, médico ou local..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
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

      <Tabs defaultValue="agendados" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="agendados">Exames Agendados</TabsTrigger>
          <TabsTrigger value="realizados">Histórico de Exames</TabsTrigger>
        </TabsList>

        <TabsContent value="agendados">
          <Card>
            <CardHeader>
              <CardTitle>Próximos Exames</CardTitle>
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
              ) : examesAgendados.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Você não possui exames agendados no momento.
                </div>
              ) : (
                <div className="space-y-4">
                  {examesAgendados.map((e) => (
                    <div key={e.id || `${e.data}-${e.nome}`} className="flex flex-col md:flex-row gap-4 border rounded-lg p-4 bg-app-soft dark:bg-background">
                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div>
                            <p className="font-medium">{e.nome}</p>
                            <p className="text-sm text-muted-foreground">{e.medico?.nome || "—"}</p>
                          </div>
                          <div className="text-sm">
                            {e.data ? new Date(e.data).toLocaleDateString() : "—"}{" "}
                            {e.data ? `às ${new Date(e.data).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">{e.local || "Local não especificado"}</div>
                        <div className="mt-3">
                          <span className="rounded-full px-2 py-1 text-xs bg-primary/10 text-primary">{e.status}</span>
                        </div>
                      </div>
                      <div className="flex flex-row md:flex-col gap-2 justify-end">
                        {/* Espaço para ações futuras como reagendar */}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realizados">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Exames</CardTitle>
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
              ) : examesRealizados.length === 0 ? (
                <div className="text-sm text-muted-foreground">Você não possui exames realizados no histórico.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Exame</TableHead>
                      <TableHead>Médico</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {examesFiltrados.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{e.data ? new Date(e.data).toLocaleDateString() : "—"}</TableCell>
                        <TableCell>{e.nome}</TableCell>
                        <TableCell>{e.medico?.nome || "—"}</TableCell>
                        <TableCell>
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              (e.status || "").toLowerCase().includes("conclu") || (e.status || "").toLowerCase() === "realizado"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {e.status || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-3">
                            {e.resultado_url ? (
                              <>
                                <a
                                  href={e.resultado_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group inline-flex items-center gap-2 rounded-lg border border-emerald-500/60 bg-gradient-to-b from-emerald-500/10 to-emerald-600/10 px-3 py-1.5 text-emerald-300 hover:from-emerald-500/20 hover:to-emerald-600/20 hover:text-emerald-100 shadow-sm shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                  title="Abrir resultado em nova aba"
                                >
                                  <Eye className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                                  <span>Ver</span>
                                </a>

                                <Button
                                  variant="outline"
                                  className="group inline-flex items-center gap-2 rounded-lg border-emerald-500/60 bg-gradient-to-b from-emerald-500/10 to-emerald-600/10 px-3 py-1.5 text-emerald-300 hover:from-emerald-500/20 hover:to-emerald-600/20 hover:text-emerald-100 shadow-sm shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                  onClick={() => void handleDownloadFile(e)}
                                  title="Baixar arquivo"
                                >
                                  <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                                  <span>Baixar</span>
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="text-sm text-muted-foreground">Sem arquivo</span>
                                <Button
                                  variant="outline"
                                  disabled
                                  className="inline-flex items-center gap-2 rounded-lg border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 to-emerald-600/5 px-3 py-1.5 text-emerald-400/50 disabled:opacity-60 disabled:cursor-not-allowed"
                                  title="Resultado ainda não disponível"
                                >
                                  <Download className="h-4 w-4" />
                                  <span>Baixar</span>
                                </Button>
                              </>
                            )}
                          </div>
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
    URL.revokeObjectURL(link.href)
  } catch (err) {
    console.warn("[Exames] download falhou:", err?.response?.status)
    alert("Não foi possível baixar o resultado. Tente novamente.")
  }
}
