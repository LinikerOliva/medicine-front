import { Input } from "@/components/ui/input"
import { PatientProfileSummary } from "@/components/patient-profile-summary"
import { ProfileTabs } from "@/components/profile-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Search } from "lucide-react"
import { useParams } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import api from "@/services/api"
import { medicoService } from "@/services/medicoService"

export default function PacienteConsultas() {
  const { id } = useParams()
  const [consultas, setConsultas] = useState([])
  const [loading, setLoading] = useState(true)
  const [patient, setPatient] = useState(null)
  const [loadingPatient, setLoadingPatient] = useState(true)
  const [mid, setMid] = useState(null)

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
      try {
        const baseRaw = import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/"
        const base = baseRaw.endsWith("/") ? baseRaw : `${baseRaw}/`
        const res = await api.get(`${base}${id}/`)
        if (active) setPatient(res.data)
      } catch (_) {}
      finally { if (active) setLoadingPatient(false) }
      try {
        const m = await medicoService._resolveMedicoId().catch(() => null)
        if (active) setMid(m)
      } catch {}
      try {
        const endpointRaw = import.meta.env.VITE_CONSULTAS_ENDPOINT || "/consultas/"
        const endpoint = endpointRaw.endsWith("/") ? endpointRaw : `${endpointRaw}/`
        const params = { paciente: id, paciente_id: id, limit: 100 }
        const res = await api.get(endpoint, { params })
        const data = res?.data
        const list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
        if (active) setConsultas(list)
      } catch (e) {
        try { console.debug("[Medico/Consultas] falha listar:", e?.response?.status) } catch {}
        if (active) setConsultas([])
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [id])

  const todas = useMemo(() => Array.isArray(consultas) ? consultas : [], [consultas])
  const minhas = useMemo(() => todas.filter((c) => {
    const cid = c?.medico?.id || c?.medico_id
    return mid ? String(cid) === String(mid) : false
  }), [todas, mid])
  const outros = useMemo(() => todas.filter((c) => {
    const cid = c?.medico?.id || c?.medico_id
    return mid ? String(cid) !== String(mid) : false
  }), [todas, mid])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Consultas do Paciente</h1>
        <p className="text-muted-foreground">Histórico de consultas e atendimentos</p>
      </div>

      <PatientProfileSummary patientId={id} isPacienteView={false} profile={patient?.user} patient={patient} loading={loadingPatient} />

      <ProfileTabs tabs={medicoTabs} basePath={`/medico/paciente/${id}`} />

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar consultas..." className="pl-10" />
        </div>
        <div className="flex gap-2" />
      </div>

      <Tabs defaultValue="todas">
        <TabsList>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="minhas">Minhas</TabsTrigger>
          <TabsTrigger value="outros">Outros Médicos</TabsTrigger>
        </TabsList>
        <TabsContent value="todas">
          <Card>
            <CardHeader>
              <CardTitle>Histórico Completo de Consultas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : todas.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma consulta encontrada.</p>
                ) : (
                  todas.map((c) => {
                    const dataStr = c.data_hora ? new Date(c.data_hora).toLocaleDateString() : (c.data || "—")
                    const resumo = c.resumo || c.summary || c.observacoes || c.descricao || c.motivo || "—"
                    const medicamentos = c.medicamentos_uso || c.medicamentos || c.itens || "—"
                    const exames = c.exames_solicitados || c.exames || "—"
                    return (
                      <div key={c.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" /> {dataStr}
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Resumo</p>
                          <p className="text-sm whitespace-pre-wrap">{resumo}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Medicamentos</p>
                          {Array.isArray(medicamentos) ? (
                            <ul className="text-sm list-disc pl-4 space-y-1">
                              {medicamentos.map((m, i) => (
                                <li key={i}>{typeof m === 'string' ? m : (m?.descricao || m?.nome || m?.medicamento || JSON.stringify(m))}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{medicamentos}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Exames Solicitados</p>
                          <p className="text-sm whitespace-pre-wrap">{exames}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="minhas">
          <Card>
            <CardHeader>
              <CardTitle>Consultas Realizadas por Mim</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : minhas.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma consulta realizada por você com este paciente.</p>
                ) : (
                  minhas.map((c) => {
                    const dataStr = c.data_hora ? new Date(c.data_hora).toLocaleDateString() : (c.data || "—")
                    const resumo = c.resumo || c.summary || c.observacoes || c.descricao || c.motivo || "—"
                    const medicamentos = c.medicamentos_uso || c.medicamentos || c.itens || "—"
                    const exames = c.exames_solicitados || c.exames || "—"
                    return (
                      <div key={c.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" /> {dataStr}
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Resumo</p>
                          <p className="text-sm whitespace-pre-wrap">{resumo}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Medicamentos</p>
                          {Array.isArray(medicamentos) ? (
                            <ul className="text-sm list-disc pl-4 space-y-1">
                              {medicamentos.map((m, i) => (
                                <li key={i}>{typeof m === 'string' ? m : (m?.descricao || m?.nome || m?.medicamento || JSON.stringify(m))}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{medicamentos}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Exames Solicitados</p>
                          <p className="text-sm whitespace-pre-wrap">{exames}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="outros">
          <Card>
            <CardHeader>
              <CardTitle>Consultas com Outros Médicos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : outros.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma consulta com outros médicos.</p>
                ) : (
                  outros.map((c) => {
                    const dataStr = c.data_hora ? new Date(c.data_hora).toLocaleDateString() : (c.data || "—")
                    const resumo = c.resumo || c.summary || c.observacoes || c.descricao || c.motivo || "—"
                    const medicamentos = c.medicamentos_uso || c.medicamentos || c.itens || "—"
                    const exames = c.exames_solicitados || c.exames || "—"
                    return (
                      <div key={c.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" /> {dataStr}
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Resumo</p>
                          <p className="text-sm whitespace-pre-wrap">{resumo}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Medicamentos</p>
                          {Array.isArray(medicamentos) ? (
                            <ul className="text-sm list-disc pl-4 space-y-1">
                              {medicamentos.map((m, i) => (
                                <li key={i}>{typeof m === 'string' ? m : (m?.descricao || m?.nome || m?.medicamento || JSON.stringify(m))}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{medicamentos}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Exames Solicitados</p>
                          <p className="text-sm whitespace-pre-wrap">{exames}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
