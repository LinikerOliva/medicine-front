"use client"

import { PatientProfileSummary } from "@/components/patient-profile-summary"
import { ProfileTabs } from "@/components/profile-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, FileText, ClipboardList, User } from "lucide-react"
import { Link, useParams } from "react-router-dom"

export default function PacientePerfil() {
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
        <h1 className="text-3xl font-bold tracking-tight">Perfil do Paciente</h1>
        <p className="text-muted-foreground">Visualize e gerencie as informações do paciente</p>
      </div>

      <PatientProfileSummary patientId={id} isPacienteView={false} />

      <ProfileTabs tabs={medicoTabs} basePath={`/medico/paciente/${id}`} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nome</p>
                  <p className="text-muted-foreground">—</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data de Nascimento</p>
                  <p className="text-muted-foreground">—</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">CPF</p>
                  <p className="text-muted-foreground">—</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                  <p className="text-muted-foreground">—</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Endereço</p>
                  <p className="text-muted-foreground">—</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resumo Médico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Histórico de Consultas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 rounded-lg border p-3">
                  <div className="flex-1">
                    <p className="font-medium">Consulta de Rotina</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(Date.now() - i * 30 * 86400000).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Dr. Carlos Oliveira</p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/medico/paciente/${id}/consultas`}>Ver</Link>
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" asChild>
                <Link to={`/medico/paciente/${id}/consultas`}>Ver Todas</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Exames Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 rounded-lg border p-3">
                  <div className="flex-1">
                    <p className="font-medium">Hemograma Completo</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(Date.now() - i * 7 * 86400000).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Solicitado por: Dr. Ana Souza</p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/medico/paciente/${id}/exames`}>Ver</Link>
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" asChild>
                <Link to={`/medico/paciente/${id}/exames`}>Ver Todos</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
