"use client"

import { PatientProfileSummary } from "@/components/patient-profile-summary"
import { ProfileTabs } from "@/components/profile-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Calendar, User } from "lucide-react"
import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import api from "@/services/api"

export default function PacienteProntuario() {
  const { id } = useParams() // Obtém o parâmetro "id" da URL
  const [patient, setPatient] = useState(null)
  const [prontuarios, setProntuarios] = useState([])
  const [loading, setLoading] = useState(true)

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
        const basePacRaw = import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/"
        const basePac = basePacRaw.endsWith("/") ? basePacRaw : `${basePacRaw}/`
        const res = await api.get(`${basePac}${id}/`)
        if (active) setPatient(res.data)
      } catch (_) {}
      try {
        const baseProntRaw = import.meta.env.VITE_PRONTUARIO_ENDPOINT || import.meta.env.VITE_PRONTUARIOS_ENDPOINT || "/prontuarios/"
        const basePront = baseProntRaw.endsWith("/") ? baseProntRaw : `${baseProntRaw}/`
        const r = await api.get(basePront, { params: { paciente: id, paciente_id: id, limit: 50 } })
        const data = r?.data
        const list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
        if (active) setProntuarios(list)
      } catch (_) {
        if (active) setProntuarios([])
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [id])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Prontuário do Paciente</h1>
        <p className="text-muted-foreground">Histórico médico completo</p>
      </div>

      <PatientProfileSummary patientId={id} isPacienteView={false} profile={patient?.user} patient={patient} loading={loading} />

      <ProfileTabs tabs={medicoTabs} basePath={`/medico/paciente/${id}`} />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tipo Sanguíneo</p>
                  <p>{patient?.tipo_sanguineo || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Alergias</p>
                  <p>{Array.isArray(patient?.alergias) ? (patient.alergias.length ? patient.alergias.join(", ") : "—") : (patient?.alergias || "—")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Condições Crônicas</p>
                  <p>{patient?.condicoes_cronicas || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Medicamentos em Uso</p>
                  <p>{patient?.medicamentos_uso || "—"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Histórico de Consultas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : prontuarios.length === 0 ? (
                <p className="text-muted-foreground">Nenhum registro de prontuário encontrado para este paciente.</p>
              ) : (
                prontuarios.map((p) => (
                  <div key={p.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{p.medico?.user ? `${p.medico.user.first_name || ""} ${p.medico.user.last_name || ""}`.trim() : (p.medico?.nome || "Médico")}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{p.data || p.data_hora ? new Date(p.data_hora || p.data).toLocaleDateString() : "—"}</p>
                    </div>
                    {p.diagnostico_principal && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Diagnóstico</p>
                        <p>{p.diagnostico_principal}</p>
                      </div>
                    )}
                    {p.conduta && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Conduta</p>
                        <p>{p.conduta}</p>
                      </div>
                    )}
                    {p.exames_solicitados && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Exames Solicitados</p>
                        <p>{p.exames_solicitados}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
