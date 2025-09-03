"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { ThemeToggle } from "@/components/theme-toggle"
import { pacienteService } from "@/services/pacienteService"

export default function ConfiguracoesAdmin() {
  const { toast } = useToast()

  // Perfil
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    telefone: "",
  })

  // Segurança
  const [pwd, setPwd] = useState({
    atual: "",
    nova: "",
    confirmar: "",
  })
  const [changingPwd, setChangingPwd] = useState(false)

  // Notificações (persistência local – escopo admin)
  const [notifs, setNotifs] = useState({
    email: true,
    sistema: true,
    auditoria: true,
    push: false,
  })
  const [savingNotifs, setSavingNotifs] = useState(false)

  // Sistema
  const [idioma, setIdioma] = useState(() => localStorage.getItem("admin_lang") || "pt-BR")

  // NOVO: toggler no mesmo estilo do paciente
  const toggleNotif = (key) => setNotifs((p) => ({ ...p, [key]: !p[key] }))

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoading(true)
        setError("")
        // Reutiliza endpoint do usuário atual
        const profile = await pacienteService.getPerfil()
        if (!active) return
        setForm({
          first_name: profile?.first_name || "",
          last_name: profile?.last_name || "",
          email: profile?.email || "",
          telefone: profile?.telefone || "",
        })

        // Notificações salvas localmente
        try {
          const raw = localStorage.getItem("admin_notification_prefs")
          if (raw) setNotifs((cur) => ({ ...cur, ...JSON.parse(raw) }))
        } catch {}
      } catch (e) {
        if (!active) return
        const st = e?.response?.status
        setError(st === 401 ? "Sessão inválida. Faça login novamente." : "Não foi possível carregar seu perfil.")
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
  }

  const salvarPerfil = async () => {
    setSaving(true)
    setError("")
    try {
      await pacienteService.atualizarPerfil({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        telefone: form.telefone,
      })
      toast({ title: "Perfil atualizado", description: "As informações foram salvas com sucesso." })
    } catch (e) {
      const st = e?.response?.status
      const msg = st === 400 ? "Dados inválidos. Verifique os campos." : "Não foi possível salvar as alterações."
      setError(msg)
      toast({ title: "Erro", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const salvarSenha = async () => {
    // Placeholder – sem endpoint específico no backend atual
    if (!pwd.atual || !pwd.nova || !pwd.confirmar) {
      toast({ title: "Validação", description: "Preencha todos os campos de senha.", variant: "destructive" })
      return
    }
    if (pwd.nova !== pwd.confirmar) {
      toast({ title: "Validação", description: "A confirmação da nova senha não confere.", variant: "destructive" })
      return
    }
    setChangingPwd(true)
    try {
      // Aqui entraria um POST para /auth/password/change/ (quando disponível)
      await new Promise((r) => setTimeout(r, 600))
      toast({ title: "Em breve", description: "Alteração de senha será integrada ao backend.", variant: "default" })
      setPwd({ atual: "", nova: "", confirmar: "" })
    } finally {
      setChangingPwd(false)
    }
  }

  const salvarNotificacoes = async () => {
    setSavingNotifs(true)
    try {
      localStorage.setItem("admin_notification_prefs", JSON.stringify(notifs))
      toast({ title: "Notificações salvas", description: "Preferências armazenadas neste dispositivo." })
    } catch {
      toast({ title: "Erro", description: "Não foi possível salvar as preferências.", variant: "destructive" })
    } finally {
      setSavingNotifs(false)
    }
  }

  const salvarIdioma = () => {
    localStorage.setItem("admin_lang", idioma)
    toast({ title: "Idioma atualizado", description: `Idioma definido para ${idioma}.` })
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações (Admin)</h1>
        <p className="text-muted-foreground">Gerencie seu perfil e preferências administrativas</p>
      </div>

      <Tabs defaultValue="perfil" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="seguranca">Segurança</TabsTrigger>
          <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
          <TabsTrigger value="sistema">Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Nome</Label>
                  <Input id="first_name" name="first_name" value={form.first_name} onChange={handleFormChange} disabled={loading || saving} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Sobrenome</Label>
                  <Input id="last_name" name="last_name" value={form.last_name} onChange={handleFormChange} disabled={loading || saving} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" name="email" type="email" value={form.email} onChange={handleFormChange} disabled={loading || saving} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" name="telefone" value={form.telefone} onChange={handleFormChange} disabled={loading || saving} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={salvarPerfil} disabled={loading || saving}>
                  {saving ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguranca">
          <Card>
            <CardHeader>
              <CardTitle>Segurança</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pwd_atual">Senha atual</Label>
                  <Input id="pwd_atual" type="password" value={pwd.atual} onChange={(e) => setPwd((p) => ({ ...p, atual: e.target.value }))} disabled={changingPwd} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pwd_nova">Nova senha</Label>
                  <Input id="pwd_nova" type="password" value={pwd.nova} onChange={(e) => setPwd((p) => ({ ...p, nova: e.target.value }))} disabled={changingPwd} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pwd_confirmar">Confirmar nova senha</Label>
                  <Input id="pwd_confirmar" type="password" value={pwd.confirmar} onChange={(e) => setPwd((p) => ({ ...p, confirmar: e.target.value }))} disabled={changingPwd} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={salvarSenha} disabled={changingPwd}>
                  {changingPwd ? "Processando..." : "Alterar senha"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Notificação</CardTitle>
              <CardDescription>Configure como você deseja receber notificações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notificações por Email</p>
                    <p className="text-sm text-muted-foreground">Receba atualizações importantes por email</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleNotif("email")}
                    disabled={savingNotifs}
                  >
                    {notifs.email ? "Ativado" : "Desativado"}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Eventos do Sistema</p>
                    <p className="text-sm text-muted-foreground">Avisos sobre operações e eventos administrativos</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleNotif("sistema")}
                    disabled={savingNotifs}
                  >
                    {notifs.sistema ? "Ativado" : "Desativado"}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Alterações e Auditoria</p>
                    <p className="text-sm text-muted-foreground">Notifique mudanças críticas e logs de auditoria</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleNotif("auditoria")}
                    disabled={savingNotifs}
                  >
                    {notifs.auditoria ? "Ativado" : "Desativado"}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notificações Push</p>
                    <p className="text-sm text-muted-foreground">Receba notificações no navegador</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleNotif("push")}
                    disabled={savingNotifs}
                  >
                    {notifs.push ? "Ativado" : "Desativado"}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={salvarNotificacoes} disabled={savingNotifs}>
                  {savingNotifs ? "Salvando..." : "Salvar Preferências"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sistema">
          <Card>
            <CardHeader>
              <CardTitle>Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tema</Label>
                <div className="flex items-center gap-3">
                  <ThemeToggle />
                  <span className="text-sm text-muted-foreground">Alterne entre claro/escuro</span>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Idioma</Label>
                <div className="flex items-center gap-3">
                  <select className="border rounded px-2 py-1" value={idioma} onChange={(e) => setIdioma(e.target.value)}>
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                  </select>
                  <Button variant="outline" onClick={salvarIdioma}>Aplicar</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}