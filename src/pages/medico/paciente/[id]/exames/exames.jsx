import { PatientProfileSummary } from "@/components/patient-profile-summary"
import { ProfileTabs } from "@/components/profile-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Search, Eye, Download, ClipboardList, Plus } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useParams } from "react-router-dom"

export default function PacienteExames() {
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
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border rounded-lg p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Hemograma Completo</p>
                      <p className="text-sm text-muted-foreground">Solicitado em {new Date(Date.now() - i * 86400000).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Solicitação
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Baixar Pedido
                      </Button>
                    </div>
                  </div>
                ))}
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
                {[1, 2].map((i) => (
                  <div key={i} className="border rounded-lg p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Raio-X de Tórax</p>
                      <p className="text-sm text-muted-foreground">Concluído em {new Date(Date.now() - i * 3 * 86400000).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar Resultado
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Baixar Resultado
                      </Button>
                    </div>
                  </div>
                ))}
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
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="border rounded-lg p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Exame #{i}</p>
                      <p className="text-sm text-muted-foreground">Status: {i % 2 === 0 ? "Concluído" : "Pendente"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <ClipboardList className="mr-2 h-4 w-4" />
                        Detalhes
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Baixar
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
