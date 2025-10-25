import { Input } from "@/components/ui/input"
import { PatientProfileSummary } from "@/components/patient-profile-summary"
import { ProfileTabs } from "@/components/profile-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Search, User, FileText, Download } from "lucide-react"
import { Link, useParams } from "react-router-dom"

export default function PacienteConsultas() {
  const { id } = useParams()

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
        <h1 className="text-3xl font-bold tracking-tight">Consultas do Paciente</h1>
        <p className="text-muted-foreground">Histórico de consultas e atendimentos</p>
      </div>

      <PatientProfileSummary patientId={id} isPacienteView={false} />

      <ProfileTabs tabs={medicoTabs} basePath={`/medico/paciente/${id}`} />

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar consultas..." className="pl-10" />
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to={`/medico/paciente/${id}/iniciar-consulta`}>
              <Calendar className="mr-2 h-4 w-4" />
              Nova Consulta
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="todas">
        <TabsList>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="minhas">Minhas Consultas</TabsTrigger>
          <TabsTrigger value="outros">Outros Médicos</TabsTrigger>
        </TabsList>
        <TabsContent value="todas">
          <Card>
            <CardHeader>
              <CardTitle>Histórico Completo de Consultas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{i % 2 === 0 ? "Dr. Carlos Oliveira" : "Dra. Ana Souza"}</p>
                        <span className="text-sm text-muted-foreground">
                          {i % 3 === 0 ? "Cardiologia" : i % 3 === 1 ? "Clínica Geral" : "Endocrinologia"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {new Date(Date.now() - i * 30 * 86400000).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Motivo da Consulta</p>
                      <p>
                        {i % 3 === 0
                          ? "Consulta de rotina"
                          : i % 3 === 1
                            ? "Dor abdominal"
                            : "Acompanhamento de tratamento"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Diagnóstico</p>
                      <p>
                        {i % 3 === 0
                          ? "Hipertensão Arterial Estágio 1"
                          : i % 3 === 1
                            ? "Gastrite"
                            : "Hipotireoidismo sob controle"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Conduta</p>
                      <p>
                        {i % 3 === 0
                          ? "Manutenção da medicação atual. Recomendação de atividade física regular e redução do consumo de sal."
                          : i % 3 === 1
                            ? "Prescrição de omeprazol 20mg por 30 dias. Recomendação de dieta específica."
                            : "Ajuste da dose de levotiroxina para 75mcg. Retorno em 60 dias com exames."}
                      </p>
                    </div>
                    <div className="pt-2 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm">
                        <FileText className="mr-2 h-4 w-4" />
                        Ver Prontuário Completo
                      </Button>
                      {i % 2 === 0 && (
                        <Button variant="outline" size="sm">
                          <Download className="mr-2 h-4 w-4" />
                          Baixar Receita
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
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
                {[1, 3].map((i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">Dr. Carlos Oliveira</p>
                        <span className="text-sm text-muted-foreground">Cardiologia</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {new Date(Date.now() - i * 30 * 86400000).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Motivo da Consulta</p>
                      <p>{i % 3 === 0 ? "Consulta de rotina" : "Acompanhamento de tratamento"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Diagnóstico</p>
                      <p>{i % 3 === 0 ? "Hipertensão Arterial Estágio 1" : "Hipotireoidismo sob controle"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Conduta</p>
                      <p>
                        {i % 3 === 0
                          ? "Manutenção da medicação atual. Recomendação de atividade física regular e redução do consumo de sal."
                          : "Ajuste da dose de levotiroxina para 75mcg. Retorno em 60 dias com exames."}
                      </p>
                    </div>
                    <div className="pt-2 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm">
                        <FileText className="mr-2 h-4 w-4" />
                        Ver Prontuário Completo
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Baixar Receita
                      </Button>
                    </div>
                  </div>
                ))}
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
                {[2, 4, 5].map((i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">Dra. Ana Souza</p>
                        <span className="text-sm text-muted-foreground">
                          {i % 3 === 0 ? "Cardiologia" : i % 3 === 1 ? "Clínica Geral" : "Endocrinologia"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {new Date(Date.now() - i * 30 * 86400000).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Motivo da Consulta</p>
                      <p>{i % 3 === 1 ? "Dor abdominal" : "Acompanhamento de tratamento"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Diagnóstico</p>
                      <p>{i % 3 === 1 ? "Gastrite" : "Hipotireoidismo sob controle"}</p>
                    </div>
                    <div className="pt-2 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm">
                        <FileText className="mr-2 h-4 w-4" />
                        Ver Prontuário Resumido
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
