import { PatientProfileSummary } from "@/components/patient-profile-summary"
import { ProfileTabs } from "@/components/profile-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Search, Eye, Download, ClipboardList, Plus } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function PacienteExames({ params }) {
  const { id } = params

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
        <h1 className="text-3xl font-bold tracking-tight">Exames do Paciente</h1>
        <p className="text-muted-foreground">Visualize e gerencie exames do paciente</p>
      </div>

      <PatientProfileSummary patientId={id} isPacienteView={false} />
      <ProfileTabs tabs={medicoTabs} basePath={`/medico/paciente/${id}`} />

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar exames..." className="pl-10" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo de exame" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="laboratoriais">Laboratoriais</SelectItem>
              <SelectItem value="imagem">Imagem</SelectItem>
              <SelectItem value="cardio">Cardiológicos</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <ClipboardList className="mr-2 h-4 w-4" />
            Solicitar Exame
          </Button>
        </div>
      </div>

      <Tabs defaultValue="todos">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
          <TabsTrigger value="realizados">Realizados</TabsTrigger>
          <TabsTrigger value="solicitados-por-mim">Solicitados por Mim</TabsTrigger>
        </TabsList>

        {/* TabsContent "todos" e "pendentes" você já tem completos */}

        <TabsContent value="realizados">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Exames Realizados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[3, 4, 5, 6].map((i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="flex flex-col md:flex-row justify-between gap-2">
                      <div>
                        <h3 className="font-bold">
                          {i % 3 === 0 ? "Hemograma Completo" : i % 3 === 1 ? "Perfil Lipídico" : "Eletrocardiograma"}
                        </h3>
                        <div className="mt-1 text-sm text-muted-foreground">
                          Solicitado por: {i % 2 === 0 ? "Dr. Carlos Oliveira" : "Dra. Ana Souza"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Realizado em: {new Date(Date.now() - i * 15 * 86400000).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="rounded-full px-2 py-1 text-xs inline-flex bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        Realizado
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar Resultado
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Baixar PDF
                      </Button>
                      <Button variant="outline" size="sm">
                        <ClipboardList className="mr-2 h-4 w-4" />
                        Solicitar Novo
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="solicitados-por-mim">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Exames Solicitados por Mim
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="flex flex-col md:flex-row justify-between gap-2">
                      <div>
                        <h3 className="font-bold">{i % 2 === 0 ? "Hemograma Completo" : "Perfil Lipídico"}</h3>
                        <div className="mt-1 text-sm text-muted-foreground">Solicitado por: Você</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Solicitado em: {new Date(Date.now() - i * 10 * 86400000).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="rounded-full px-2 py-1 text-xs inline-flex bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                        Pendente
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Registrar Resultado
                      </Button>
                      <Button variant="outline" size="sm">
                        Reagendar
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        Cancelar
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
