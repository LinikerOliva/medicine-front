import { useEffect, useState, useMemo } from "react"
import { pacienteService } from "@/services/pacienteService"
import { ProfileTabs } from "@/components/profile-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { History, Calendar, Stethoscope, FlaskConical, Eye, Download, Pill } from "lucide-react"
import api from "@/services/api"

export default function PacienteHistoricoMedico() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filtros
  const [tipo, setTipo] = useState("todos") // todos | consultas | exames | receitas
  const [status, setStatus] = useState("todos")
  const [busca, setBusca] = useState("")

  // Helpers robustos para mapear dados vindos da API
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

  const formatDateKey = (iso) => {
    if (!iso) return "sem-data"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "sem-data"
    // chave por dia (yyyy-mm-dd)
    return d.toISOString().slice(0, 10)
  }

  const formatDateHuman = (iso) => {
    try {
      const d = new Date(iso)
      return d.toLocaleString()
    } catch {
      return iso || "—"
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [consultasRes, examesRes, receitasRes] = await Promise.allSettled([
          pacienteService.getConsultas(),
          pacienteService.getExames(),
          pacienteService.getReceitas(),
        ])

        const consultas =
          consultasRes.status === "fulfilled"
            ? (Array.isArray(consultasRes.value) ? consultasRes.value : consultasRes.value?.results) || []
            : []

        const examesRaw =
          examesRes.status === "fulfilled"
            ? (Array.isArray(examesRes.value) ? examesRes.value : examesRes.value?.results) || []
            : []

        const receitasRaw =
          receitasRes.status === "fulfilled"
            ? (Array.isArray(receitasRes.value) ? receitasRes.value : receitasRes.value?.results) || []
            : []

        // Mapeia exames
        const exames = examesRaw.map((e) => ({
          id: e.id || Math.random(),
          tipo: "exame",
          data: e.data_agendamento || e.data_solicitacao || e.data || e.data_hora || null,
          titulo: `Exame - ${getExamName(e)}`.trim(),
          detalhe: getDoctorName(e?.medico_solicitante || e?.medico),
          status: e.status || e.situacao || "pendente",
          resultado_url: getResultUrl(e),
          nome: getExamName(e),
        }))

        // Mapeia consultas
        const consultasMap = consultas.map((c) => ({
          id: c.id || Math.random(),
          tipo: "consulta",
          data: c.data_hora || c.data || null,
          titulo: `Consulta - ${c.especialidade || c.medico?.especialidade || ""}`.trim(),
          detalhe: c.medico?.nome || getDoctorName(c?.medico) || "",
          status: c.status || "pendente",
        }))

        // Mapeia receitas
        const receitas = receitasRaw.map((r) => {
          const medico = r.medico || r.consulta?.medico
          const meds =
            Array.isArray(r.itens) && r.itens.length
              ? r.itens.map((it) => it?.medicamento?.nome || it?.medicamento || "").filter(Boolean).join(", ")
              : r.medicamentos || "Prescrição"
          return {
            id: r.id || Math.random(),
            tipo: "receita",
            data: r.created_at || r.data || r.emissao || r.data_emissao || null,
            titulo: `Receita - ${meds}`.trim(),
            detalhe: getDoctorName(medico),
            status: r.status || (r.arquivo_assinado ? "assinada" : "emitida"),
            // usar o mesmo campo esperado pelo handleDownloadFile
            resultado_url: r.arquivo_assinado || null,
            nome: "Receita",
          }
        })

        const timeline = [...consultasMap, ...exames, ...receitas]
          .filter((x) => x.data)
          .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0))

        if (mounted) setItems(timeline)
      } catch (e) {
        setError("Não foi possível carregar o histórico.")
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

  // Filtro, busca e agrupamento por dia
  const filtradosAgrupados = useMemo(() => {
    let base = items

    if (tipo !== "todos") {
      const mapTipo = { consultas: "consulta", exames: "exame", receitas: "receita" }
      base = base.filter((it) => it.tipo === (mapTipo[tipo] || tipo))
    }
    if (status !== "todos") {
      base = base.filter((it) => (it.status || "").toLowerCase() === status.toLowerCase())
    }
    if (busca.trim()) {
      const q = busca.toLowerCase()
      base = base.filter(
        (it) =>
          it.titulo?.toLowerCase().includes(q) ||
          it.detalhe?.toLowerCase().includes(q) ||
          (it.status || "").toLowerCase().includes(q)
      )
    }

    // Agrupa por dia
    const groups = {}
    for (const it of base) {
      const key = formatDateKey(it.data)
      if (!groups[key]) groups[key] = []
      groups[key].push(it)
    }

    // Ordena grupos (desc) e elementos (já estão em desc)
    const orderedKeys = Object.keys(groups).sort((a, b) => (a < b ? 1 : -1))
    return { groups, orderedKeys }
  }, [items, tipo, status, busca])

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5" />
        <h1 className="text-2xl font-bold tracking-tight">Histórico Médico</h1>
      </div>

      <ProfileTabs tabs={pacienteTabs} basePath="/paciente" />

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Input
            placeholder="Buscar por título, médico, status..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="consultas">Consultas</SelectItem>
            <SelectItem value="exames">Exames</SelectItem>
            <SelectItem value="receitas">Receitas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="solicitado">Solicitado</SelectItem>
            <SelectItem value="agendado">Agendado</SelectItem>
            <SelectItem value="realizado">Realizado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Linha do Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-6 w-2/3" />
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : filtradosAgrupados.orderedKeys.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum evento encontrado.</div>
          ) : (
            <div className="space-y-8">
              {filtradosAgrupados.orderedKeys.map((dayKey) => (
                <div key={dayKey}>
                  <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {dayKey === "sem-data" ? "Sem data" : new Date(dayKey).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="relative pl-6">
                    <div className="absolute left-1 top-0 bottom-0 w-px bg-border" />
                    <ul className="space-y-4">
                      {filtradosAgrupados.groups[dayKey].map((ev) => (
                        <li key={ev.id} className="relative">
                          <span
                            className={`absolute -left-[7px] top-1 inline-flex items-center justify-center h-4 w-4 rounded-full ${
                              ev.tipo === "consulta" ? "bg-primary" : ev.tipo === "exame" ? "bg-emerald-500" : "bg-indigo-500"
                            }`}
                            title={ev.tipo === "consulta" ? "Consulta" : ev.tipo === "exame" ? "Exame" : "Receita"}
                          />
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 text-muted-foreground">
                                {ev.tipo === "consulta" ? (
                                  <Stethoscope className="h-4 w-4" />
                                ) : ev.tipo === "exame" ? (
                                  <FlaskConical className="h-4 w-4 text-emerald-400" />
                                ) : (
                                  <Pill className="h-4 w-4 text-indigo-400" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{ev.titulo}</p>
                                <p className="text-sm text-muted-foreground">
                                  {ev.detalhe || "—"} {ev.status ? `• ${ev.status}` : ""}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {formatDateHuman(ev.data)}
                                </p>
                              </div>
                            </div>

                            {/* Ações para Exames */}
                            {ev.tipo === "exame" && (
                              <div className="flex items-center gap-2">
                                {ev.resultado_url ? (
                                  <>
                                    <a
                                      href={ev.resultado_url}
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
                                      onClick={() => void handleDownloadFile(ev)}
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
                            )}

                            {/* Ações para Receitas */}
                            {ev.tipo === "receita" && (
                              <div className="flex items-center gap-2">
                                {ev.resultado_url ? (
                                  <>
                                    <a
                                      href={ev.resultado_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/60 bg-gradient-to-b from-indigo-500/10 to-indigo-600/10 px-3 py-1.5 text-indigo-300 hover:from-indigo-500/20 hover:to-indigo-600/20 hover:text-indigo-100 shadow-sm shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                      title="Abrir receita em nova aba"
                                    >
                                      <Eye className="h-4 w-4" />
                                      <span>Ver</span>
                                    </a>
                                    <Button
                                      variant="outline"
                                      className="inline-flex items-center gap-2 rounded-lg border-indigo-500/60 bg-gradient-to-b from-indigo-500/10 to-indigo-600/10 px-3 py-1.5 text-indigo-300 hover:from-indigo-500/20 hover:to-indigo-600/20 hover:text-indigo-100 shadow-sm shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                      onClick={() => void handleDownloadFile(ev)}
                                      title="Baixar PDF"
                                    >
                                      <Download className="h-4 w-4" />
                                      <span>Baixar</span>
                                    </Button>
                                  </>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Sem PDF assinado</span>
                                )}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Utilitário: download autenticado com extração de filename
const handleDownloadFile = async (item) => {
  try {
    let url = item?.resultado_url
    if (!url) return

    // Se for data: ou blob:, baixar diretamente sem requisição HTTP
    if (/^(data|blob):/i.test(url)) {
      const link = document.createElement("a")
      link.href = url
      link.download = `${item.nome || "resultado"}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      return
    }

    // Se for relativo, prefixa com base do backend
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
    console.warn("[Historico Medico] download falhou:", err?.response?.status)
    alert("Não foi possível baixar o resultado. Tente novamente.")
  }
}
