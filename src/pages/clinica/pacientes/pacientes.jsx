import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Input } from "../../../components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table"
import { clinicaService } from "../../../services/clinicaService"
import { useToast } from "../../../hooks/use-toast"
import { Button } from "../../../components/ui/button"
import { Link } from "react-router-dom"

export default function PacientesClinica() {
  const { toast } = useToast()
  const breadcrumbs = [{ label: "Dashboard", href: "/clinica/dashboard" }, { label: "Pacientes" }]
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(false)
  const [pacientes, setPacientes] = useState([])

  const fetchPacientes = async () => {
    setLoading(true)
    try {
      const { data } = await clinicaService.getPacientes()
      const list = Array.isArray(data) ? data : (data?.results || [])
      setPacientes(list)
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível carregar os pacientes.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPacientes() }, [])

  const filtered = pacientes.filter((p) =>
    [p.nome, p.email, p.cpf].join(" ").toLowerCase().includes(q.toLowerCase())
  )
  const hoje = new Date().toISOString().split("T")[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pacientes</h1>
          <p className="text-muted-foreground">Listagem de pacientes</p>
        </div>
        <div className="w-72">
          <Input placeholder="Buscar por nome, e-mail ou CPF" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Pacientes</CardTitle>
          <CardDescription>{loading ? "Carregando..." : `${filtered.length} registro(s)`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>CPF</TableHead>
                  {/* ADICIONAR: coluna Ações */}
                  <TableHead className="w-[1%]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p, idx) => (
                  <TableRow key={p.id || idx}>
                    <TableCell>{p.nome || "-"}</TableCell>
                    <TableCell>{p.email || "-"}</TableCell>
                    <TableCell>{p.cpf || "-"}</TableCell>
                    {/* ADICIONAR: botão Agendar -> calendário com query params */}
                    <TableCell>
                      <Link to={`/clinica/calendario?paciente=${p.id}&data=${hoje}`}>
                        <Button size="sm">Agendar</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhum paciente encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}