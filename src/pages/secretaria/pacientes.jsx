"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, Search, Phone, Mail, Stethoscope, Plus } from "lucide-react"
import { medicoService } from "@/services/medicoService"
import { secretariaService } from "@/services/secretariaService"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

function formatPaciente(p = {}) {
  const user = p?.user || {}
  const nome = p?.nome || [user.first_name, user.last_name].filter(Boolean).join(" ")
  return nome || user.username || `Paciente #${p?.id || "?"}`
}

export default function PacientesSecretaria() {
  const [medicos, setMedicos] = useState([])
  const [medicoId, setMedicoId] = useState("")
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(false)
  const [pacientes, setPacientes] = useState([])

  const { toast } = useToast()

  // Dialog state
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nome: "",
    email: "",
    cpf: "",
    telefone: "",
    data_nascimento: "",
    endereco: "",
    senha: "",
    confirmSenha: "",
  })

  const formatCPF = (value) => {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 11)
    const p1 = digits.slice(0, 3)
    const p2 = digits.slice(3, 6)
    const p3 = digits.slice(6, 9)
    const p4 = digits.slice(9, 11)
    if (digits.length > 9) return `${p1}.${p2}.${p3}-${p4}`
    if (digits.length > 6) return `${p1}.${p2}.${p3}`
    if (digits.length > 3) return `${p1}.${p2}`
    return p1
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === "cpf") return setForm((f) => ({ ...f, cpf: formatCPF(value) }))
    setForm((f) => ({ ...f, [name]: value }))
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const list = await secretariaService.listarMedicos()
        if (!mounted) return
        setMedicos(Array.isArray(list) ? list : [])
        const stored = localStorage.getItem("secretaria.medicoId")
        if (stored) setMedicoId(String(stored))
      } catch {}
    })()
    return () => {
      mounted = false
    }
  }, [])

  const fetchPacientes = async () => {
    if (!medicoId) return setPacientes([])
    setLoading(true)
    try {
      // Não há endpoint dedicado no serviço; usar pacientes do médico (se disponível)
      const data = await medicoService.getPacientesVinculados(medicoId)
      const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
      setPacientes(list)
    } catch (e) {
      setPacientes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPacientes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicoId])

  const filtered = useMemo(
    () => pacientes.filter((p) => formatPaciente(p).toLowerCase().includes(q.toLowerCase())),
    [pacientes, q]
  )

  const handleCreate = async (e) => {
    e?.preventDefault?.()
    if (!form.nome || !form.email || !form.senha || !form.confirmSenha) {
      toast({ title: "Campos obrigatórios", description: "Preencha nome, email e senha.", variant: "destructive" })
      return
    }
    if (form.senha !== form.confirmSenha) {
      toast({ title: "Senhas não conferem", description: "A confirmação deve ser igual à senha.", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      await secretariaService.registrarPaciente(form)
      toast({ title: "Paciente cadastrado", description: "O paciente foi criado com sucesso. Ele aparecerá na lista do médico após o primeiro vínculo (ex.: agendamento de consulta)." })
      setOpen(false)
      setForm({ nome: "", email: "", cpf: "", telefone: "", data_nascimento: "", endereco: "", senha: "", confirmSenha: "" })
      // Observação: o paciente só aparecerá na lista do médico após um vínculo (ex.: primeira consulta criada)
    } catch (err) {
      const msg = err?.response?.data ? JSON.stringify(err.response.data) : (err?.message || "Falha ao cadastrar")
      toast({ title: "Erro ao cadastrar", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-semibold">Pacientes</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <span className="inline-flex items-center gap-2"><Search className="h-5 w-5" /> Filtros</span>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <button className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                  <Plus className="h-4 w-4 mr-2" /> Cadastrar Paciente
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Novo Paciente</DialogTitle>
                  <DialogDescription>Preencha os dados básicos para criar a conta do paciente.</DialogDescription>
                </DialogHeader>
                <form className="space-y-3" onSubmit={handleCreate}>
                  <div>
                    <label className="text-sm text-muted-foreground">Nome completo</label>
                    <Input name="nome" value={form.nome} onChange={handleChange} placeholder="Ex.: Maria Silva" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">E-mail</label>
                    <Input name="email" value={form.email} onChange={handleChange} type="email" placeholder="email@exemplo.com" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground">CPF</label>
                      <Input name="cpf" value={form.cpf} onChange={handleChange} placeholder="000.000.000-00" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Telefone</label>
                      <Input name="telefone" value={form.telefone} onChange={handleChange} placeholder="(00) 00000-0000" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground">Data de nascimento</label>
                      <Input name="data_nascimento" type="date" value={form.data_nascimento} onChange={handleChange} />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Endereço</label>
                      <Input name="endereco" value={form.endereco} onChange={handleChange} placeholder="Rua, número, bairro" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground">Senha</label>
                      <Input name="senha" type="password" value={form.senha} onChange={handleChange} />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Confirmar senha</label>
                      <Input name="confirmSenha" type="password" value={form.confirmSenha} onChange={handleChange} />
                    </div>
                  </div>
                  <DialogFooter>
                    <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 rounded-md text-sm border mr-2">Cancelar</button>
                    <button type="submit" disabled={saving} className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                      {saving ? "Salvando..." : "Criar"}
                    </button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">Médico</label>
              <Select
                value={medicoId || undefined}
                onValueChange={(v) => {
                  setMedicoId(v)
                  try {
                    localStorage.setItem("secretaria.medicoId", String(v))
                  } catch {}
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um médico" />
                </SelectTrigger>
                <SelectContent>
                  {medicos.map((m) => {
                    const label = m?.nome || [m?.user?.first_name, m?.user?.last_name].filter(Boolean).join(" ") || `Médico #${m?.id}`
                    return (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Pesquisar</label>
              <Input placeholder="Nome do paciente" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={fetchPacientes}
                className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                <Stethoscope className="h-4 w-4 mr-2" /> Buscar
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground">Nenhum paciente encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatPaciente(p)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div>
                        <Phone className="inline h-4 w-4 mr-1" /> {p?.user?.phone || "—"}
                      </div>
                      <div>
                        <Mail className="inline h-4 w-4 mr-1" /> {p?.user?.email || "—"}
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