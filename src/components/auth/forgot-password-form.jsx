"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { ArrowLeft, Mail, User, Building2 } from "lucide-react"
import { useToast } from "../../hooks/use-toast"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [activeTab, setActiveTab] = useState("paciente")
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  
  useEffect(() => {
    // Verificar se há um parâmetro de role na URL
    const params = new URLSearchParams(location.search)
    const role = params.get("role")
    if (role === "clinica" || role === "paciente") {
      setActiveTab(role)
    }
  }, [location])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Simulação de envio de email
      await new Promise((resolve) => setTimeout(resolve, 1500))

      setEmailSent(true)
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar o email. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-soft py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md shadow-app-lg border-0 backdrop-blur-sm bg-white/95">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Email Enviado!</CardTitle>
            <CardDescription>
              Enviamos um link para redefinir sua senha para <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Verifique sua caixa de entrada e spam. O link expira em 24 horas.
            </p>
            <Button variant="outline" className="w-full bg-transparent" onClick={() => setEmailSent(false)}>
              Enviar para outro email
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate(`/login?role=${activeTab}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-soft py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-app-lg border-0 backdrop-blur-sm bg-white/95">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Esqueceu sua senha?</CardTitle>
          <CardDescription className="text-center">
            Digite seu email para receber um link de redefinição
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paciente" className="flex items-center justify-center gap-2">
                <User className="h-4 w-4" />
                <span>Paciente</span>
              </TabsTrigger>
              <TabsTrigger value="clinica" className="flex items-center justify-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>Clínica</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Enviando..." : "Enviar Link de Redefinição"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to={`/login?role=${activeTab}`} className="text-primary hover:underline flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ForgotPasswordForm
