import { PatientProfileSummary } from "@/components/patient-profile-summary"
import { ProfileTabs } from "@/components/profile-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Search, Eye, Download, ClipboardList, Plus } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Link, useParams } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import api from "@/services/api"

export default function PacienteExames() {
  const { id } = useParams()
  const [busca, setBusca] = useState("")
  const [exames, setExames] = useState([])
  const [loading, setLoading] = useState(true)
  const [patient, setPatient] = useState(null)
  const [loadingPatient, setLoadingPatient] = useState(true)

  const medicoTabs = [
    { label: "Resumo", href: `/medico/paciente/${id}/perfil` },
    { label: "Prontuário", href: `/medico/paciente/${id}/prontuario` },
    { label: "Consultas", href: `/medico/paciente/${id}/consultas` },
    { label: "Exames", href: `/medico/paciente/${id}/exames` },
    { label: "Receitas", href: `/medico/paciente/${id}/receitas` },
  ]

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const baseRaw = import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/"
        const base = baseRaw.endsWith("/") ? baseRaw : `${baseRaw}/`
        const res = await api.get(`${base}${id}/`)
        if (active) setPatient(res.data)
      } catch (e) {
      } finally {
        if (active) setLoadingPatient(false)
      }
      try {
        const endpointRaw = import.meta.env.VITE_EXAMES_ENDPOINT || "/exames/"
        const endpoint = endpointRaw.endsWith("/") ? endpointRaw : `${endpointRaw}/`
        const res = await api.get(endpoint, { params: { paciente: id, paciente_id: id, limit: 100 } })
        const data = res?.data
        const list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
        if (active) setExames(list)
      } catch (e) {
        try { console.debug("[Medico/Exames] falha listar:", e?.response?.status) } catch {}
        if (active) setExames([])
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [id])

  const filtrar = useMemo(() => {
    const term = (busca || "").toLowerCase()
    return Array.isArray(exames) ? exames.filter((e) => {
      const tipo = String(e?.tipo || e?.nome || e?.categoria || "").toLowerCase()
      const status = String(e?.status || e?.situacao || "").toLowerCase()
      const desc = String(e?.descricao || e?.observacoes || "").toLowerCase()
      return !term || tipo.includes(term) || status.includes(term) || desc.includes(term)
    }) : []
  }, [exames, busca])

  const pendentes = filtrar.filter((e) => String(e?.status || e?.situacao || "").toLowerCase() === "pendente")
  const concluidos = filtrar.filter((e) => ["concluido", "concluído", "finalizado", "realizado"].includes(String(e?.status || e?.situacao || "").toLowerCase()))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Exames do Paciente</h1>
        <p className="text-muted-foreground">Visualize e gerencie exames do paciente</p>
      </div>

      <PatientProfileSummary patientId={id} isPacienteView={false} profile={patient?.user} patient={patient} loading={loadingPatient} />
      <ProfileTabs tabs={medicoTabs} basePath={`/medico/paciente/${id}`} />

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar exames..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-10" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo de exame" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="imagem">Imagem</SelectItem>
              <SelectItem value="laboratorial">Laboratorial</SelectItem>
              <SelectItem value="outros">Outros</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Período
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Solicitar Exame
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pendentes">
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
          <TabsTrigger value="concluidos">Concluídos</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>
        <TabsContent value="pendentes">
          <Card>
            <CardHeader>
              <CardTitle>Exames Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : pendentes.length === 0 ? (
                  <p className="text-muted-foreground">Nenhum exame pendente.</p>
                ) : (
                  pendentes.map((ex) => (
                    <div key={ex.id} className="border rounded-lg p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{ex.tipo || ex.nome || "Exame"}</p>
                        <p className="text-sm text-muted-foreground">Solicitado em {ex.data_agendamento ? new Date(ex.data_agendamento).toLocaleDateString() : "—"}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Solicitação
                        </Button>
                        {ex.pedido_pdf && (
                          <Button variant="outline" size="sm" asChild>
                            <Link to={ex.pedido_pdf} target="_blank">
                              <Download className="mr-2 h-4 w-4" />
                              Baixar Pedido
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="concluidos">
          <Card>
            <CardHeader>
              <CardTitle>Exames Concluídos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : concluidos.length === 0 ? (
                  <p className="text-muted-foreground">Nenhum exame concluído.</p>
                ) : (
                  concluidos.map((ex) => (
                    <div key={ex.id} className="border rounded-lg p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{ex.tipo || ex.nome || "Exame"}</p>
                        <p className="text-sm text-muted-foreground">Concluído em {ex.data_agendamento ? new Date(ex.data_agendamento).toLocaleDateString() : "—"}</p>
                      </div>
                      <div className="flex gap-2">
                        {ex.resultado_pdf && (
                          <Button variant="outline" size="sm" asChild>
                            <Link to={ex.resultado_pdf} target="_blank">
                              <Eye className="mr-2 h-4 w-4" />
                              Resultado
                            </Link>
                          </Button>
                        )}
                        {ex.resultado_pdf && (
                          <Button variant="outline" size="sm" asChild>
                            <Link to={ex.resultado_pdf} target="_blank">
                              <Download className="mr-2 h-4 w-4" />
                              Baixar
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="todos">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Exames</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : filtrar.length === 0 ? (
                  <p className="text-muted-foreground">Nenhum exame encontrado.</p>
                ) : (
                  filtrar.map((ex) => (
                    <div key={ex.id} className="border rounded-lg p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{ex.tipo || ex.nome || "Exame"}</p>
                        <p className="text-sm text-muted-foreground">Status: {ex.status || ex.situacao || "—"}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <ClipboardList className="mr-2 h-4 w-4" />
                          Detalhes
                        </Button>
                        {ex.resultado_pdf && (
                          <Button variant="outline" size="sm" asChild>
                            <Link to={ex.resultado_pdf} target="_blank">
                              <Download className="mr-2 h-4 w-4" />
                              Baixar
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
