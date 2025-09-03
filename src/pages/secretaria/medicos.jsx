"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Stethoscope, Search, Phone, Mail, User } from "lucide-react"
import { secretariaService } from "@/services/secretariaService"

function formatName(m) {
  const user = m?.user || {}
  const nome = m?.nome || [user.first_name, user.last_name].filter(Boolean).join(" ")
  return nome || user.username || `Médico #${m?.id || "?"}`
}

export default function MedicosSecretaria() {
  const [query, setQuery] = useState("")
  const [medicos, setMedicos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const list = await secretariaService.listarMedicos()
        if (!mounted) return
        setMedicos(Array.isArray(list) ? list : [])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const filtered = useMemo(
    () => medicos.filter((m) => formatName(m).toLowerCase().includes(query.toLowerCase())),
    [medicos, query]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Stethoscope className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-semibold">Médicos</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" /> Buscar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Digite o nome do médico"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground">Nenhum médico encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CRM</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead>Contato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4" /> {formatName(m)}
                    </TableCell>
                    <TableCell>{m.crm || "—"}</TableCell>
                    <TableCell>{m.especialidade || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" /> {m.telefone || m?.user?.phone || "—"}
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" /> {m?.user?.email || "—"}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}