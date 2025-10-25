import { useEffect, useState } from "react"
import { ClinicaLayout } from "../../../layouts/clinica-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { DatePicker } from "../../../components/ui/date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table"
import { clinicaService } from "../../../services/clinicaService"
import { useToast } from "../../../hooks/use-toast"

export default function ExamesClinica() {
  const { toast } = useToast()
  const breadcrumbs = [
    { label: "Dashboard", href: "/clinica/dashboard" },
    { label: "Exames" }
  ]

  const [loading, setLoading] = useState(false)
  const [tipos, setTipos] = useState([])
  const [filtros, setFiltros] = useState({ q: "", tipo: "todos", status: "todos" })
  const [exames, setExames] = useState([])
  const [criando, setCriando] = useState(false)
  const [formNovo, setFormNovo] = useState({ paciente: "", tipo: "", data: "", hora: "" })

  const fetchTipos = async () => {
    try {
      const { data } = await clinicaService.getTiposExame()
      setTipos(data || [])
    } catch (e) {
      // opcional: silenciar
    }
  }

  const fetchExames = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filtros.q) params.q = filtros.q
      if (filtros.tipo !== "todos") params.tipo = filtros.tipo
      if (filtros.status !== "todos") params.status = filtros.status
      const { data } = await clinicaService.getExames(params)
      setExames(Array.isArray(data) ? data : (data?.results || []))
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível carregar os exames.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTipos()
  }, [])
  useEffect(() => {
    fetchExames()
  }, [filtros])

  const handleCriar = async () => {
    if (!formNovo.paciente || !formNovo.tipo || !formNovo.data || !formNovo.hora) {
      toast({ title: "Campos obrigatórios", description: "Preencha paciente, tipo, data e hora.", variant: "destructive" })
      return
    }
    setCriando(true)
    try {
      const payload = {
        paciente: formNovo.paciente,
        tipo: formNovo.tipo,
        data: formNovo.data,
        hora: formNovo.hora,
      }
      await clinicaService.createExame(payload)
      toast({ title: "Exame criado", description: "Exame agendado com sucesso." })
      setFormNovo({ paciente: "", tipo: "", data: "", hora: "" })
      fetchExames()
    } catch (e) {
      toast({ title: "Erro ao criar", description: "Verifique os dados e tente novamente.", variant: "destructive" })
    } finally {
      setCriando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exames</h1>
          <p className="text-muted-foreground">Listagem e agendamento de exames</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Busque e filtre os exames</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Input
            placeholder="Buscar por paciente/tipo..."
            value={filtros.q}
            onChange={(e) => setFiltros({ ...filtros, q: e.target.value })}
          />
          <Select value={filtros.tipo} onValueChange={(v) => setFiltros({ ...filtros, tipo: v })}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {tipos.map((t) => (
                <SelectItem key={t.id || t.value || t} value={t.value || t.nome || t.id || String(t)}>
                  {t.nome || t.label || t.value || t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtros.status} onValueChange={(v) => setFiltros({ ...filtros, status: v })}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Exames</CardTitle>
          <CardDescription>{loading ? "Carregando..." : `${exames.length} registro(s)`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exames.map((e, idx) => (
                  <TableRow key={e.id || idx}>
                    <TableCell>{e.paciente_nome || e.paciente || "-"}</TableCell>
                    <TableCell>{e.tipo_nome || e.tipo || "-"}</TableCell>
                    <TableCell>{e.data || "-"}</TableCell>
                    <TableCell>{e.hora || "-"}</TableCell>
                    <TableCell>{e.status || "-"}</TableCell>
                  </TableRow>
                ))}
                {!loading && exames.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum exame encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Novo exame */}
      <Card>
        <CardHeader>
          <CardTitle>Novo Exame</CardTitle>
          <CardDescription>Crie um novo agendamento de exame</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <Input
            placeholder="Paciente (nome/ID)"
            value={formNovo.paciente}
            onChange={(e) => setFormNovo({ ...formNovo, paciente: e.target.value })}
          />
          <Select value={formNovo.tipo} onValueChange={(v) => setFormNovo({ ...formNovo, tipo: v })}>
            <SelectTrigger><SelectValue placeholder="Tipo de exame" /></SelectTrigger>
            <SelectContent>
              {tipos.map((t) => (
                <SelectItem key={t.id || t.value || t} value={t.value || t.nome || t.id || String(t)}>
                  {t.nome || t.label || t.value || t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DatePicker value={formNovo.data} onChange={(val) => setFormNovo({ ...formNovo, data: val })} minDate={new Date()} />
          <div className="flex gap-2">
            <Input
              type="time"
              value={formNovo.hora}
              onChange={(e) => setFormNovo({ ...formNovo, hora: e.target.value })}
            />
            <Button onClick={handleCriar} disabled={criando}>
              {criando ? "Criando..." : "Criar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}