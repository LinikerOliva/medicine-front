import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, Calendar, FileText, User } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Link } from "react-router-dom"
import { useEffect, useState } from "react"
import { medicoService } from "@/services/medicoService"

export default function MeusPacientes() {
  const [loading, setLoading] = useState(true)
  const [pacientes, setPacientes] = useState([])
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("todos")

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const perfil = await medicoService.getPerfil()
        const medicoId = perfil?.id || perfil?.medico?.id
        if (medicoId) {
          const data = await medicoService.getPacientesVinculados(medicoId)
          if (active) setPacientes(Array.isArray(data) ? data : [])
        } else {
          if (active) setPacientes([])
        }
      } catch {
        if (active) setPacientes([])
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const filtered = pacientes.filter((p) => {
    const name =
      (p?.user
        ? [p.user.first_name, p.user.last_name].filter(Boolean).join(" ").trim()
        : p?.nome || "")
        .toLowerCase()
    const matchesName = !query || name.includes(query.toLowerCase())
    const matchesStatus = status === "todos" || status === (p?.user?.is_active ? "ativo" : "inativo")
    return matchesName && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meus Pacientes</h1>
        <p className="text-muted-foreground">Liste e gerencie seus pacientes ativos</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar pacientes..." className="pl-10" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {/* mantenho o Select de status para futura integração */}
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
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
            Filtrar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <div className="h-6 w-40 bg-muted animate-pulse rounded" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-4 w-full bg-muted animate-pulse rounded" />
                  <div className="h-4 w-full bg-muted animate-pulse rounded" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-8 w-full bg-muted animate-pulse rounded" />
                  <div className="h-8 w-full bg-muted animate-pulse rounded" />
                  <div className="h-8 w-full bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const id = p?.id || p?.user?.id
            const nome =
              p?.user
                ? [p.user.first_name, p.user.last_name].filter(Boolean).join(" ").trim()
                : p?.nome || `Paciente ${id}`
            return (
              <Card key={id}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-xl font-semibold">
                      {nome?.[0]?.toUpperCase() || "P"}
                    </div>
                    <div>
                      <h3 className="font-bold">{nome}</h3>
                      <p className="text-sm text-muted-foreground">ID: {id}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1">
                    {p?.condicoes_cronicas && <Badge variant="outline" className="bg-primary/5">{p.condicoes_cronicas}</Badge>}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link to={`/medico/paciente/${id}/perfil`}>
                        <User className="mr-1 h-4 w-4" />
                        <span className="hidden sm:inline">Perfil</span>
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link to={`/medico/paciente/${id}/prontuario`}>
                        <FileText className="mr-1 h-4 w-4" />
                        <span className="hidden sm:inline">Prontuário</span>
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link to={`/medico/paciente/${id}/iniciar-consulta`}>
                        <Calendar className="mr-1 h-4 w-4" />
                        <span className="hidden sm:inline">Consulta</span>
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* paginação futura, mantida como placeholder visual */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Mostrando 6 de 24 pacientes</div>
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
            4
          </Button>
          <Button variant="outline" size="sm">
            Próximo
          </Button>
        </div>
      </div>
    </div>
  )
}
