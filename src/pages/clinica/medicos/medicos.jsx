import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Input } from "../../../components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table"
import { clinicaService } from "../../../services/clinicaService"
import { useToast } from "../../../hooks/use-toast"

export default function MedicosClinica() {
  const { toast } = useToast()
  const breadcrumbs = [{ label: "Dashboard", href: "/clinica/dashboard" }, { label: "Médicos" }]
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(false)
  const [medicos, setMedicos] = useState([])

  const fetchMedicos = async () => {
    setLoading(true)
    try {
      const { data } = await clinicaService.getMedicos()
      const list = Array.isArray(data) ? data : (data?.results || [])
      setMedicos(list)
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível carregar os médicos.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMedicos() }, [])

  const filtered = medicos.filter((m) =>
    [m.nome, m.email, m.crm, m.especialidade].join(" ").toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Médicos</h1>
          <p className="text-muted-foreground">Listagem de médicos</p>
        </div>
        <div className="w-72">
          <Input placeholder="Buscar por nome, e-mail, CRM, especialidade" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Médicos</CardTitle>
          <CardDescription>{loading ? "Carregando..." : `${filtered.length} registro(s)`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>CRM</TableHead>
                  <TableHead>Especialidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m, idx) => (
                  <TableRow key={m.id || idx}>
                    <TableCell>{m.nome || "-"}</TableCell>
                    <TableCell>{m.email || "-"}</TableCell>
                    <TableCell>{m.crm || "-"}</TableCell>
                    <TableCell>{m.especialidade || "-"}</TableCell>
                  </TableRow>
                ))}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum médico encontrado
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