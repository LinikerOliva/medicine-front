import { useState } from "react"
import { ClinicaLayout } from "../../../layouts/clinica-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Input } from "../../../components/ui/input"
import { Button } from "../../../components/ui/button"
import { useToast } from "../../../hooks/use-toast"
import { Label } from "../../../components/ui/label"
import { adminService } from "../../../services/adminService"
import { clinicaService } from "../../../services/clinicaService"

export default function ConfiguracoesClinica() {
  const [form, setForm] = useState({ nome: "", cnpj: "", email: "", responsavel: "" })
  const [secEmail, setSecEmail] = useState("")
  const [secNome, setSecNome] = useState("")
  const [secSobrenome, setSecSobrenome] = useState("")
  const [secSenha, setSecSenha] = useState("")
  const [linking, setLinking] = useState(false)
  const [secError, setSecError] = useState("")
  const [secSuccess, setSecSuccess] = useState("")
  const { toast } = useToast()

  // NOVO: formatador de CNPJ e limitação
  const formatCNPJ = (value) => {
    const d = String(value || "").replace(/\D/g, "").slice(0, 14)
    const p1 = d.slice(0, 2)
    const p2 = d.slice(2, 5)
    const p3 = d.slice(5, 8)
    const p4 = d.slice(8, 12)
    const p5 = d.slice(12, 14)
    if (d.length > 12) return `${p1}.${p2}.${p3}/${p4}-${p5}`
    if (d.length > 8) return `${p1}.${p2}.${p3}/${p4}`
    if (d.length > 5) return `${p1}.${p2}.${p3}`
    if (d.length > 2) return `${p1}.${p2}`
    return p1
  }

  const handleSave = async () => {
    // Aqui futuramente podemos chamar um clinicaService.updatePerfil(form)
    toast({ title: "Configurações", description: "Alterações salvas (stub)." })
  }

  async function handleAddSecretary(createNew = true) {
    setSecError("")
    setSecSuccess("")

    if (!secEmail) {
      setSecError("Informe o e-mail da secretária.")
      return
    }

    setLinking(true)
    try {
      let secretariaId = null

      if (createNew) {
        const payload = {
          email: secEmail,
          first_name: secNome || undefined,
          last_name: secSobrenome || undefined,
          password: secSenha || undefined,
          role: "secretaria",
          type: "secretaria",
        }
        const created = await adminService.createUsuario(payload)
        secretariaId = created?.id || created?.usuario?.id || created?.user?.id || created?.pk || null
        if (!secretariaId) {
          // tenta extrair id de estruturas comuns
          const maybeId = created && typeof created === "object" ? (created.user?.pk || created.usuario?.pk) : null
          if (maybeId) secretariaId = maybeId
        }
        if (!secretariaId) {
          throw new Error("Não foi possível obter o ID da secretária criada.")
        }
      } else {
        // vincular existente por email
        const res = await adminService.getUsuarios({ search: secEmail, page: 1, page_size: 100 })
        const lista = Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : []
        const found = lista.find((u) => String(u.email || "").toLowerCase() === secEmail.toLowerCase())
        if (!found) {
          throw new Error("Não foi possível localizar uma usuária com esse e-mail.")
        }
        secretariaId = found.id || found.pk
        if (!secretariaId) {
          throw new Error("Usuária encontrada, porém sem ID válido.")
        }
      }

      await clinicaService.vincularSecretaria(secretariaId)
      setSecSuccess("Secretária vinculada com sucesso.")
      setSecEmail("")
      setSecNome("")
      setSecSobrenome("")
      setSecSenha("")
    } catch (e) {
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : e?.message || "Falha ao processar solicitação."
      setSecError(msg)
    } finally {
      setLinking(false)
    }
  }

  return (
    <ClinicaLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Configurações</h1>

      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da Clínica</CardTitle>
          <CardDescription>Edite os dados básicos</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm">Nome</label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome da clínica" />
          </div>
          <div className="space-y-2">
            <label className="text-sm">CNPJ</label>
            <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: formatCNPJ(e.target.value) })} placeholder="00.000.000/0000-00" />
          </div>
          <div className="space-y-2">
            <label className="text-sm">E-mail</label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@clinica.com" />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Responsável</label>
            <Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} placeholder="Nome do responsável" />
          </div>
          <div className="md:col-span-2">
            <Button onClick={handleSave}>Salvar alterações</Button>
          </div>
        </CardContent>
      </Card>

      {/* Card: Adicionar secretária */}
      <Card>
        <CardHeader>
          <CardTitle>Adicionar secretária</CardTitle>
          <CardDescription>Crie uma nova secretária ou vincule por e-mail existente</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            {secError && <div className="text-sm text-red-600">{secError}</div>}
            {secSuccess && <div className="text-sm text-emerald-700">{secSuccess}</div>}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>E-mail da secretária</Label>
            <Input type="email" value={secEmail} onChange={(e) => setSecEmail(e.target.value)} placeholder="secretaria@exemplo.com" />
          </div>
          <div className="space-y-2">
            <Label>Nome (opcional)</Label>
            <Input value={secNome} onChange={(e) => setSecNome(e.target.value)} placeholder="Nome" />
          </div>
          <div className="space-y-2">
            <Label>Sobrenome (opcional)</Label>
            <Input value={secSobrenome} onChange={(e) => setSecSobrenome(e.target.value)} placeholder="Sobrenome" />
          </div>
          <div className="space-y-2">
            <Label>Senha (opcional)</Label>
            <Input type="password" value={secSenha} onChange={(e) => setSecSenha(e.target.value)} placeholder="Senha inicial (ou deixe em branco)" />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <Button onClick={() => handleAddSecretary(true)} disabled={linking}>
              {linking ? "Processando..." : "Criar e vincular"}
            </Button>
            <Button variant="outline" onClick={() => handleAddSecretary(false)} disabled={linking}>
              {linking ? "Processando..." : "Vincular por e-mail"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </ClinicaLayout>
  )
}