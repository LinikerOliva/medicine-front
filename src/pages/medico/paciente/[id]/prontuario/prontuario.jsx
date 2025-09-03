"use client"

import { PatientProfileSummary } from "@/components/patient-profile-summary"
import { ProfileTabs } from "@/components/profile-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Calendar, User } from "lucide-react"
import { useParams } from "react-router-dom"

export default function PacienteProntuario() {
  const { id } = useParams() // Obtém o parâmetro "id" da URL

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
        <h1 className="text-3xl font-bold tracking-tight">Prontuário do Paciente</h1>
        <p className="text-muted-foreground">Histórico médico completo</p>
      </div>

      <PatientProfileSummary patientId={id} isPacienteView={false} />

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
                  <p>O+</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Alergias</p>
                  <p>Penicilina, Amendoim</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Condições Crônicas</p>
                  <p>Hipertensão</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Medicamentos em Uso</p>
                  <p>Losartana 50mg, Hidroclorotiazida 25mg</p>
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
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">Dr. Carlos Oliveira</p>
                      <span className="text-sm text-muted-foreground">Cardiologia</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(Date.now() - i * 30 * 86400000).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Diagnóstico</p>
                    <p>Hipertensão Arterial Estágio 1</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Conduta</p>
                    <p>
                      Manutenção da medicação atual. Recomendação de atividade física regular e redução do consumo de
                      sal.
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Exames Solicitados</p>
                    <p>Hemograma completo, Perfil lipídico, Função renal</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
