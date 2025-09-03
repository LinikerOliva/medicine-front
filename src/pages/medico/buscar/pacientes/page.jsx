import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, User, Eye, Calendar } from "lucide-react"
import { Link } from "react-router-dom"

export default function BuscarPacientes() {
  // Dados simulados de pacientes
  const pacientes = [
    {
      id: "1",
      nome: "João Silva",
      idade: 38,
      cpf: "123.456.789-00",
      ultimaConsulta: "15/03/2023",
      tipoSanguineo: "O+",
      status: "Ativo",
    },
    {
      id: "2",
      nome: "Maria Oliveira",
      idade: 45,
      cpf: "234.567.890-11",
      ultimaConsulta: "22/04/2023",
      tipoSanguineo: "A+",
      status: "Ativo",
    },
    {
      id: "3",
      nome: "Pedro Santos",
      idade: 29,
      cpf: "345.678.901-22",
      ultimaConsulta: "10/01/2023",
      tipoSanguineo: "B-",
      status: "Inativo",
    },
    {
      id: "4",
      nome: "Ana Costa",
      idade: 52,
      cpf: "456.789.012-33",
      ultimaConsulta: "05/05/2023",
      tipoSanguineo: "AB+",
      status: "Ativo",
    },
    {
      id: "5",
      nome: "Lucas Ferreira",
      idade: 33,
      cpf: "567.890.123-44",
      ultimaConsulta: "18/02/2023",
      tipoSanguineo: "O-",
      status: "Ativo",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Buscar Pacientes</h1>
        <p className="text-muted-foreground">Encontre pacientes no sistema</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, CPF ou ID" className="pl-10" />
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <Select>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
              <Button>
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filtros Avançados
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Idade</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Última Consulta</TableHead>
              <TableHead>Tipo Sanguíneo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pacientes.map((paciente) => (
              <TableRow key={paciente.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {paciente.nome}
                  </div>
                </TableCell>
                <TableCell>{paciente.idade} anos</TableCell>
                <TableCell>{paciente.cpf}</TableCell>
                <TableCell>{paciente.ultimaConsulta}</TableCell>
                <TableCell>{paciente.tipoSanguineo}</TableCell>
                <TableCell>
                  <div
                    className={`rounded-full px-2 py-1 text-xs inline-flex ${
                      paciente.status === "Ativo"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {paciente.status}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/medico/paciente/${paciente.id}/perfil`}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Ver Paciente</span>
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/medico/paciente/${paciente.id}/iniciar-consulta`}>
                        <Calendar className="h-4 w-4" />
                        <span className="sr-only">Iniciar Consulta</span>
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Mostrando 5 de 42 pacientes</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            Anterior
          </Button>
          <Button variant="outline" size="sm" className="bg-primary/5">
            1
          </Button>
          <Button variant="outline" size="sm">
            2
          </Button>
          <Button variant="outline" size="sm">
            3
          </Button>
          <Button variant="outline" size="sm">
            Próximo
          </Button>
        </div>
      </div>
    </div>
  )
}
