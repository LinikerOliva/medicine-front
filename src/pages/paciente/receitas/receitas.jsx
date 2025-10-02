import { useEffect, useMemo, useState } from "react"
import { pacienteService } from "../../../services/pacienteService"
import { useToast } from "../../../hooks/use-toast"
import { ProfileTabs } from "@/components/profile-tabs"
import { 
  Pill, 
  Download, 
  Search, 
  Calendar,
  FileText,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Plus,
  Eye,
  User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue, SelectLabel } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import api from "@/services/api"

export default function ReceitasPaciente() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [receitas, setReceitas] = useState([])
  const [medicos, setMedicos] = useState([])
  const [solicitarOpen, setSolicitarOpen] = useState(false)
  const [form, setForm] = useState({ medico: "", mensagem: "" })
  const [submitting, setSubmitting] = useState(false)
  const [busca, setBusca] = useState("")

  // Filtrar itens inválidos para evitar <SelectItem value=""> (Radix não permite valor vazio)
  const medicosValidos = useMemo(() =>
    Array.isArray(medicos)
      ? medicos.filter((m) => m && String(m.id ?? "").trim() !== "")
      : []
  , [medicos])

  // Helper robusto para exibir o nome do médico
  const getDoctorName = (med) => {
    const user = med?.user
    const full = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim()
    return (
      full ||
      user?.nome ||
      user?.username ||
      med?.nome ||
      med?.name ||
      med?.full_name ||
      med?.medico_nome ||
      med?.doctor_name ||
      "Médico"
    )
  }
  const hasReceitas = useMemo(() => {
    if (Array.isArray(receitas)) return receitas.length > 0
    if (Array.isArray(receitas?.results)) return receitas.results.length > 0
    return false
  }, [receitas])

  const receitasList = useMemo(() => {
    const base = Array.isArray(receitas) ? receitas : (Array.isArray(receitas?.results) ? receitas.results : [])
    return [...base].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  }, [receitas])

  // Filtrar receitas por busca
  const receitasFiltradas = useMemo(() => {
    if (!busca) return receitasList
    const term = busca.toLowerCase()
    return receitasList.filter(r => {
      const medicoNome = getDoctorName(r.medico) || getDoctorName(r.consulta?.medico) || ""
      const medicamentos = r.medicamentos || ""
      return (
        medicoNome.toLowerCase().includes(term) ||
        medicamentos.toLowerCase().includes(term)
      )
    })
  }, [receitasList, busca])

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setErro("")
      try {
        const [r, ms] = await Promise.all([
          pacienteService.getReceitas(),
          pacienteService.getMedicosVinculados(),
        ])
        if (!mounted) return
        setReceitas(r)
        setMedicos(ms)

        // Fallback: se não vier médico vinculado, tenta listar geral
        if (Array.isArray(ms) && ms.length === 0) {
          try {
            const all = await pacienteService.getMedicos({ limit: 50 })
            const arr = Array.isArray(all) ? all : all?.results || []
            if (mounted && arr.length > 0) {
              setMedicos(arr)
            }
          } catch {}
        }
      } catch (e) {
        if (!mounted) return
        setErro("Falha ao carregar receitas.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const handleSolicitar = async (e) => {
    e.preventDefault()
    if (!form.medico) {
      toast({ title: "Selecione um médico", description: "Escolha o médico para enviar a solicitação." })
      return
    }
    setSubmitting(true)
    try {
      await pacienteService.solicitarReceita({ medico: form.medico, mensagem: form.mensagem })
      toast({ title: "Solicitação enviada", description: "Seu pedido de receita foi enviado ao médico." })
      setSolicitarOpen(false)
      setForm({ medico: "", mensagem: "" })
    } catch (err) {
      toast({
        title: "Erro ao solicitar",
        description: err?.response?.data?.detail || "Não foi possível enviar a solicitação.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Download autenticado do PDF assinado
  const handleDownloadAssinado = async (url, r) => {
    try {
      if (!url) return

      const downloadBlob = (blob, filename) => {
        const link = document.createElement("a")
        const objUrl = URL.createObjectURL(blob)
        link.href = objUrl
        link.download = decodeURIComponent(filename)
        document.body.appendChild(link)
        link.click()
        link.remove()
        setTimeout(() => URL.revokeObjectURL(objUrl), 2000)
      }

      const ensurePdfExt = (name, fallback = "Receita_Medica.pdf") => {
        let n = name || fallback
        if (!/\.[a-z0-9]+$/i.test(n)) n += ".pdf"
        return n
      }

      // data: URL -> converter em Blob e baixar
      if (/^data:/i.test(url)) {
        try {
          const arr = url.split(",")
          const header = arr[0] || ""
          const base64 = arr.slice(1).join(",")
          const mime = (header.match(/data:([^;]+)/i) || [])[1] || "application/pdf"
          const binary = atob(base64)
          const len = binary.length
          const bytes = new Uint8Array(len)
          for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
          const blob = new Blob([bytes], { type: mime })
          const baseName = `Receita_${r?.id || "documento"}`
          const filename = ensurePdfExt(baseName)
          downloadBlob(blob, filename)
          return
        } catch (e) {
          console.error("[Receitas] Falha ao processar data URL:", e)
          toast({ title: "Falha no download", description: "Arquivo inválido ou corrompido.", variant: "destructive" })
          return
        }
      }

      // blob: URL -> tentar fetch para reidratar. Se não for do mesmo contexto, avisa o usuário.
      if (/^blob:/i.test(url)) {
        try {
          const resp = await fetch(url)
          const blob = await resp.blob()
          const baseName = `Receita_${r?.id || "documento"}`
          const filename = ensurePdfExt(baseName)
          downloadBlob(blob, filename)
          return
        } catch (e) {
          console.error("[Receitas] Blob URL indisponível (provavelmente de outra aba/sessão):", e)
          toast({ title: "Arquivo indisponível", description: "Essa receita foi gerada em outra aba/sessão. Gere novamente para baixar.", variant: "destructive" })
          return
        }
      }

      // Se relativo, prefixa com API base
      if (!/^https?:\/\//i.test(url)) {
        const base = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "")
        url = `${base}${url.startsWith("/") ? "" : "/"}${url}`
      }
      const res = await api.get(url, { responseType: "blob", baseURL: "" })
      const blob = new Blob([res.data], { type: res.headers["content-type"] || "application/pdf" })
      const cd = res.headers["content-disposition"] || ""
      const match = /filename\*=UTF-8''([^;]+)|filename="?([^\";]+)"?/i.exec(cd)
      let filename = match?.[1] || match?.[2]
      if (!filename) {
        try {
          const u = new URL(url)
          filename = decodeURIComponent(u.pathname.split('/').pop() || "")
        } catch {
          filename = ""
        }
      }
      if (!filename) filename = `Receita_${r?.id || "documento"}.pdf`
      filename = ensurePdfExt(filename)
      downloadBlob(blob, filename)
    } catch (e) {
      console.error("[Receitas] Falha ao baixar PDF assinado:", e?.response?.status || e)
      toast({ title: "Falha no download", description: "Não foi possível baixar o arquivo. Tente novamente.", variant: "destructive" })
    }
  }

  // Abas do paciente (mesmo padrão das outras telas)
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

  // Calcular estatísticas
  const totalReceitas = receitasList.length
  const receitasAssinadas = receitasList.filter(r => r.arquivo_assinado).length
  const receitasEsteAno = receitasList.filter(r => {
    if (!r.created_at) return false
    const receitaYear = new Date(r.created_at).getFullYear()
    return receitaYear === new Date().getFullYear()
  }).length
  const receitasRecentes = receitasList.filter(r => {
    if (!r.created_at) return false
    const receitaDate = new Date(r.created_at)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return receitaDate >= thirtyDaysAgo
  }).length

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-8 p-6">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-16 w-full" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-8 p-6">
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-500 mb-2">Erro ao carregar receitas</h3>
          <p className="text-red-500">{erro}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-6">
      {/* Header moderno */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                  <Pill className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Minhas Receitas</h1>
                  <p className="text-emerald-100">Gerencie suas receitas médicas</p>
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
                onClick={() => setSolicitarOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Solicitar Receita
              </Button>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white/10"></div>
        <div className="absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-white/10"></div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-emerald-100 text-sm font-medium">Total de Receitas</p>
                <p className="text-3xl font-bold">{totalReceitas}</p>
              </div>
              <div className="rounded-full bg-white/20 p-3">
                <FileText className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10"></div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-blue-100 text-sm font-medium">Assinadas</p>
                <p className="text-3xl font-bold">{receitasAssinadas}</p>
              </div>
              <div className="rounded-full bg-white/20 p-3">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10"></div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-amber-100 text-sm font-medium">Últimos 30 dias</p>
                <p className="text-3xl font-bold">{receitasRecentes}</p>
              </div>
              <div className="rounded-full bg-white/20 p-3">
                <Clock className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10"></div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-purple-100 text-sm font-medium">Este Ano</p>
                <p className="text-3xl font-bold">{receitasEsteAno}</p>
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
                placeholder="Buscar por médico ou medicamento..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de receitas */}
      {!hasReceitas ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12">
            <div className="text-center">
              <Pill className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">Nenhuma receita encontrada</h3>
              <p className="text-muted-foreground mb-6">Você ainda não possui receitas médicas.</p>
              <Button onClick={() => setSolicitarOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Solicitar Receita
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {receitasFiltradas.map((r) => {
            const consulta = r.consulta
            const medicoNome =
              getDoctorName(r.medico) ||
              getDoctorName(consulta?.medico) ||
              r.medico_nome ||
              r.medicoName ||
              "Médico"
            const pacienteNome =
              (consulta?.paciente?.user
                ? `${consulta.paciente.user.first_name || ""} ${consulta.paciente.user.last_name || ""}`.trim()
                : "Paciente") || "Paciente"

            return (
              <Card key={r.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900">
                          <Pill className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Receita Médica</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Emitida em {new Date(r.created_at).toLocaleDateString()} às {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={r.arquivo_assinado ? "default" : "secondary"} className={r.arquivo_assinado ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"}>
                        {r.arquivo_assinado ? "Assinada" : "Não assinada"}
                      </Badge>
                      {r.validade && (
                        <Badge variant="outline" className="text-xs">
                          Válida até {r.validade}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Informações do médico e paciente */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Stethoscope className="h-4 w-4" />
                        Médico
                      </div>
                      <p className="font-medium">{medicoNome}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <User className="h-4 w-4" />
                        Paciente
                      </div>
                      <p className="font-medium">{pacienteNome}</p>
                    </div>
                  </div>

                  {/* Medicamentos */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground">Medicamentos</h4>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.medicamentos}</p>
                    </div>
                  </div>

                  {/* Posologia */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground">Posologia</h4>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.posologia}</p>
                    </div>
                  </div>

                  {/* Observações */}
                  {r.observacoes && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground">Observações</h4>
                      <div className="rounded-lg bg-muted/50 p-4">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.observacoes}</p>
                      </div>
                    </div>
                  )}

                  {/* Itens estruturados */}
                  {Array.isArray(r.itens) && r.itens.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground">Itens estruturados</h4>
                      <div className="rounded-lg bg-muted/50 p-4">
                        <ul className="space-y-2">
                          {r.itens.map((it) => (
                            <li key={it.id} className="flex items-start gap-2 text-sm">
                              <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0"></div>
                              <div>
                                <span className="font-medium">{it.medicamento?.nome || "Medicamento"}</span>
                                {it.dose && <span className="text-muted-foreground"> - {it.dose}</span>}
                                {it.frequencia && <span className="text-muted-foreground"> | {it.frequencia}</span>}
                                {it.duracao && <span className="text-muted-foreground"> | {it.duracao}</span>}
                                {it.observacoes && <div className="text-muted-foreground text-xs mt-1">{it.observacoes}</div>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t">
                    {r.arquivo_assinado ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-emerald-500/60 bg-gradient-to-b from-emerald-500/10 to-emerald-600/10 text-emerald-700 hover:from-emerald-500/20 hover:to-emerald-600/20 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-100"
                          onClick={() => window.open(r.arquivo_assinado, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-blue-500/60 bg-gradient-to-b from-blue-500/10 to-blue-600/10 text-blue-700 hover:from-blue-500/20 hover:to-blue-600/20 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                          onClick={() => handleDownloadAssinado(r.arquivo_assinado, r)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Baixar PDF Assinado
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-amber-500/60 bg-gradient-to-b from-amber-500/10 to-amber-600/10 text-amber-700 hover:from-amber-500/20 hover:to-amber-600/20 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-100"
                          onClick={() => handleDownloadGerado(r)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Baixar PDF (Gerado)
                        </Button>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <AlertCircle className="h-3 w-3" />
                          Receita não assinada digitalmente
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal/Seção de Solicitar Receita */}
      {solicitarOpen ? (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card text-card-foreground border rounded-lg p-6 w-full max-w-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Solicitar Receita</h2>
            <form onSubmit={handleSolicitar} className="space-y-4">
              <div>
                <Label className="mb-1 block">Médico</Label>
                <Select value={form.medico} onValueChange={(v) => setForm((f) => ({ ...f, medico: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loading ? "Carregando..." : (medicosValidos.length ? "Selecione..." : "Nenhum médico disponível")} />
                  </SelectTrigger>
                  <SelectContent>
                    {medicosValidos.length === 0 ? (
                      <SelectLabel>Nenhum médico disponível</SelectLabel>
                    ) : (
                      medicosValidos.map((m) => {
                        const nome = (m?.user ? `${m.user.first_name || ""} ${m.user.last_name || ""}`.trim() : m?.nome) || "Médico"
                        return (
                          <SelectItem key={String(m.id)} value={String(m.id)}>
                            {nome} {m.crm ? `- CRM ${m.crm}` : ""}
                          </SelectItem>
                        )
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block">Mensagem (opcional)</Label>
                <Textarea
                  rows={3}
                  placeholder="Descreva sua necessidade (ex: renovação de medicamento de uso contínuo)"
                  value={form.mensagem}
                  onChange={(e) => setForm((f) => ({ ...f, mensagem: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSolicitarOpen(false)
                    setForm({ medico: "", mensagem: "" })
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Enviando..." : "Enviar solicitação"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// Fallback: gerar um PDF simples no cliente quando não houver arquivo assinado
const handleDownloadGerado = async (r) => {
  try {
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")

    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89]) // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

    const draw = (text, x, y, size = 12, color = rgb(0, 0, 0)) => {
      page.drawText(String(text || ""), { x, y, size, font, color })
    }

    let y = 800
    draw("Receita Médica (pré-assinatura, não assinada)", 50, y, 16)
    y -= 30

    const fmt = (label, val) => `${label}: ${val ?? ""}`
    draw(fmt("Emitida em", r?.created_at || r?.data_emissao || ""), 50, y); y -= 18
    draw(fmt("Médico", r?.medico_nome || r?.medico || r?.medico_id || ""), 50, y); y -= 18
    draw(fmt("Paciente", r?.paciente_nome || r?.paciente || r?.paciente_id || ""), 50, y); y -= 24

    draw("Medicamentos", 50, y, 14); y -= 18
    draw(String(r?.medicamentos || r?.itens || r?.descricao || ""), 50, y); y -= 36

    draw("Posologia", 50, y, 14); y -= 18
    draw(String(r?.posologia || r?.orientacoes || ""), 50, y); y -= 36

    if (r?.observacoes) {
      draw("Observações", 50, y, 14); y -= 18
      draw(String(r?.observacoes), 50, y); y -= 36
    }

    if (Array.isArray(r?.itens_estruturados) && r.itens_estruturados.length) {
      draw("Itens estruturados", 50, y, 14); y -= 18
      r.itens_estruturados.forEach((it) => {
        const line = Object.values(it || {}).filter(Boolean).join(" · ")
        draw(`• ${line}`, 60, y)
        y -= 16
      })
      y -= 10
    }

    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes], { type: "application/pdf" })
    const filename = `Receita_${r?.id || "documento"}.pdf`

    const link = document.createElement("a")
    const objUrl = URL.createObjectURL(blob)
    link.href = objUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(objUrl), 2000)
  } catch (e) {
    console.error("[Receitas] Falha ao gerar PDF local:", e)
    toast({ title: "Falha ao gerar PDF", description: "Tente novamente.", variant: "destructive" })
  }
}