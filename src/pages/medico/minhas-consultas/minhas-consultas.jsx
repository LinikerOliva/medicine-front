import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, Search } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Link } from "react-router-dom"
import { useEffect, useState } from "react"
import { medicoService } from "@/services/medicoService"

export default function MinhasConsultas() {
  const [loadingHoje, setLoadingHoje] = useState(true)
  const [loadingTodas, setLoadingTodas] = useState(true)
  const [consultasHoje, setConsultasHoje] = useState([])
  const [consultasTodas, setConsultasTodas] = useState([])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const perfil = await medicoService.getPerfil()
        const medicoId = perfil?.id || perfil?.medico?.id
        if (!medicoId) {
          if (active) {
            setConsultasHoje([])
            setConsultasTodas([])
          }
          return
        }

        // Hoje
        try {
          const hoje = await medicoService.getConsultasHoje(medicoId)
          if (active) setConsultasHoje(Array.isArray(hoje) ? hoje : hoje?.results || [])
        } finally {
          if (active) setLoadingHoje(false)
        }

        // Todas
        try {
          const todas = await medicoService.getConsultasDoMedico()
          const list = Array.isArray(todas) ? todas : (Array.isArray(todas?.results) ? todas.results : [])
          if (active) setConsultasTodas(list)
        } finally {
          if (active) setLoadingTodas(false)
        }
      } catch {
        if (active) {
          setConsultasHoje([])
          setConsultasTodas([])
          setLoadingHoje(false)
          setLoadingTodas(false)
        }
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const nomePaciente = (c) => {
    const u = c?.paciente?.user
    if (u) return [u.first_name, u.last_name].filter(Boolean).join(" ").trim()
    return c?.paciente_nome || c?.paciente?.nome || "Paciente"
  }
  const hora = (dh) => {
    try {
      const d = new Date(dh)
      if (!isNaN(d)) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      if (typeof dh === "string" && /^\d{2}:\d{2}/.test(dh)) return dh.slice(0, 5)
    } catch {}
    return "--:--"
  }
  const dataBr = (dh) => {
    try {
      const d = new Date(dh)
      if (!isNaN(d)) return d.toLocaleDateString()
    } catch {}
    return ""
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Minhas Consultas</h1>
        <p className="text-muted-foreground">Gerencie sua agenda de consultas</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar consultas..." className="pl-10" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" className="w-[180px]" />
          <Button>
            <Calendar className="mr-2 h-4 w-4" />
            Nova Consulta
          </Button>
        </div>
      </div>

      <Tabs defaultValue="hoje">
        <TabsList>
          <TabsTrigger value="hoje">Hoje</TabsTrigger>
          <TabsTrigger value="amanha">Amanhã</TabsTrigger>
          <TabsTrigger value="semana">Esta Semana</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>
        <TabsContent value="hoje">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Consultas para hoje, {new Date().toLocaleDateString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingHoje ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
                      <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-1/4 bg-muted animate-pulse rounded" />
                      </div>
                      <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {consultasHoje.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Nenhuma consulta para hoje.</div>
                  ) : (
                    consultasHoje.map((c) => {
                      const id = c.id
                      const pid = c?.paciente?.id || c?.paciente_id
                      return (
                        <div key={id} className="flex items-center gap-4 rounded-lg border p-4">
                          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-lg font-semibold">
                            {nomePaciente(c)?.[0]?.toUpperCase() || "P"}
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                              <div>
                                <p className="font-medium">{nomePaciente(c)}</p>
                                {pid && <p className="text-sm text-muted-foreground">ID: {pid}</p>}
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {hora(c?.data_hora)} {dataBr(c?.data_hora) ? `(${dataBr(c?.data_hora)})` : ""}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col md:flex-row gap-2">
                            {pid && (
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/medico/paciente/${pid}/perfil`}>Perfil</Link>
                              </Button>
                            )}
                            {pid && (
                              <Button size="sm" asChild>
                                <Link to={`/medico/paciente/${pid}/iniciar-consulta`}>Atender</Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="amanha">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Consultas para amanhã, {new Date(Date.now() + 86400000).toLocaleDateString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-lg font-semibold">
                      {String.fromCharCode(70 + i)}M
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <p className="font-medium">Paciente {i + 5}</p>
                          <p className="text-sm text-muted-foreground">ID: {100050 + i}</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {`${8 + i}:00`} - {`${9 + i}:00`}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <div className="rounded-full px-2 py-1 text-xs bg-primary/10 text-primary">
                          {i % 2 === 0 ? "Primeira consulta" : "Retorno"}
                        </div>
                        {i === 1 ? (
                          <div className="rounded-full px-2 py-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                            Aguardando confirmação
                          </div>
                        ) : (
                          <div className="rounded-full px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            Confirmada
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/medico/paciente/${100050 + i}/perfil`}>Perfil</Link>
                      </Button>
                      <Button variant="ghost" size="sm">
                        Reagendar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="semana">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Consultas para esta semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[1, 2, 3].map((day) => (
                  <div key={day}>
                    <h3 className="font-medium mb-3">
                      {new Date(Date.now() + day * 2 * 86400000).toLocaleDateString("pt-BR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </h3>
                    <div className="space-y-4">
                      {[1, 2].map((i) => (
                        <div key={`${day}-${i}`} className="flex items-center gap-4 rounded-lg border p-4">
                          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-lg font-semibold">
                            {String.fromCharCode(64 + day + i)}L
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                              <div>
                                <p className="font-medium">Paciente {day * 10 + i}</p>
                                <p className="text-sm text-muted-foreground">ID: {100100 + day * 10 + i}</p>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {`${9 + i}:00`} - {`${10 + i}:00`}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <div className="rounded-full px-2 py-1 text-xs bg-primary/10 text-primary">
                                {i % 2 === 0 ? "Primeira consulta" : "Retorno"}
                              </div>
                              <div className="rounded-full px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                Confirmada
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col md:flex-row gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/medico/paciente/${100100 + day * 10 + i}/perfil`}>Perfil</Link>
                            </Button>
                            <Button variant="ghost" size="sm">
                              Reagendar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="todas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Todas as Consultas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTodas ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 w-full bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {consultasTodas.map((c) => {
                    const id = c.id
                    const pid = c?.paciente?.id || c?.paciente_id
                    return (
                      <div key={id} className="flex items-center gap-4 rounded-lg border p-4">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-lg font-semibold">
                          {nomePaciente(c)?.[0]?.toUpperCase() || "P"}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <div>
                              <p className="font-medium">{nomePaciente(c)}</p>
                              {pid && <p className="text-sm text-muted-foreground">ID: {pid}</p>}
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 text-sm">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
                                <span>{dataBr(c?.data_hora)}</span>
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 text-muted-foreground mr-1" />
                                <span>{hora(c?.data_hora)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col md:flex-row gap-2">
                          {pid && (
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/medico/paciente/${pid}/perfil`}>Perfil</Link>
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">Detalhes</Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
