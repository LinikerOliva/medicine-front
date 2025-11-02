"use client"

import { PatientProfileSummary } from "@/components/patient-profile-summary"
import { ProfileTabs } from "@/components/profile-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, FileText, ClipboardList, User } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import api from "@/services/api"
import { formatDateBR } from "@/utils/dateUtils"

export default function PacientePerfil() {
  const { id } = useParams() // Obtém o parâmetro "id" da URL
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const baseRaw = import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/"
        const base = baseRaw.endsWith("/") ? baseRaw : `${baseRaw}/`
        const res = await api.get(`${base}${id}/`)
        if (active) setPatient(res.data)
      } catch (e) {
        console.debug("[PerfilPacienteMedico] Falha ao buscar paciente por id:", e?.response?.status)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [id])

  const medicoTabs = [
    { label: "Resumo", href: `/medico/paciente/${id}/perfil` },
    { label: "Prontuário", href: `/medico/paciente/${id}/prontuario` },
    { label: "Consultas", href: `/medico/paciente/${id}/consultas` },
    { label: "Exames", href: `/medico/paciente/${id}/exames` },
    { label: "Iniciar Consulta", href: `/medico/paciente/${id}/iniciar-consulta` },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Perfil do Paciente</h1>
        <p className="text-muted-foreground">Visualize e gerencie as informações do paciente</p>
      </div>

      {/* Cabeçalho com resumo do paciente */}
      <PatientProfileSummary patientId={id} isPacienteView={false} profile={patient?.user} patient={patient} loading={loading} />

      {/* Abas de navegação */}
      <ProfileTabs tabs={medicoTabs} basePath={`/medico/paciente/${id}`} />

      {/* Seções do Perfil */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Informações Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Nome</p>
              <p className="text-muted-foreground">{(patient?.nome || [patient?.user?.first_name, patient?.user?.last_name].filter(Boolean).join(" ") || patient?.user?.username) || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Data de Nascimento</p>
              <p className="text-muted-foreground">{formatDateBR(patient?.data_nascimento || patient?.user?.data_nascimento)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">CPF</p>
              <p className="text-muted-foreground">{patient?.cpf || patient?.user?.cpf || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Telefone</p>
              <p className="text-muted-foreground">{patient?.telefone || patient?.user?.phone || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Endereço</p>
              <p className="text-muted-foreground">{patient?.endereco || patient?.user?.address || "—"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Resumo Médico */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Resumo Médico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Tipo Sanguíneo</p>
              <p className="text-muted-foreground">{patient?.tipo_sanguineo || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Alergias</p>
              <p className="text-muted-foreground">{Array.isArray(patient?.alergias) ? (patient.alergias.length ? patient.alergias.join(", ") : "—") : (patient?.alergias || "—")}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Condições Crônicas</p>
              <p className="text-muted-foreground">{patient?.condicoes_cronicas || "—"}</p>
            </div>
            {/* Mantém medicamentos em uso como estático se não houver dado */}
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <div className="flex justify-end gap-3">
        <Button asChild>
          <Link to={`/medico/paciente/${id}/iniciar-consulta`}>Iniciar Consulta</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={`/medico/paciente/${id}/prontuario`}>Ver Prontuário</Link>
        </Button>
      </div>
    </div>
  )
}
