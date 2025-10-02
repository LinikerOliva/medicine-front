"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { ArrowLeft, Mail, User, Building2, CheckCircle, Loader2 } from "lucide-react"
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5"></div>
        <Card className="relative w-full max-w-md shadow-2xl border-0 backdrop-blur-xl bg-white/90 ring-1 ring-white/20">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Email Enviado!
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              Enviamos um link para redefinir sua senha para <strong className="text-gray-900">{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-100">
              <p className="text-sm text-gray-700 text-center font-medium">
                Verifique sua caixa de entrada e spam. O link expira em 24 horas.
              </p>
            </div>
            <Button 
              variant="outline" 
              className="w-full h-12 bg-white/50 hover:bg-white/80 border-gray-200 hover:border-gray-300 transition-all duration-200" 
              onClick={() => setEmailSent(false)}
            >
              Enviar para outro email
            </Button>
            <Button 
              variant="ghost" 
              className="w-full h-12 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200" 
              onClick={() => navigate(`/login?role=${activeTab}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5"></div>
      <Card className="relative w-full max-w-md shadow-2xl border-0 backdrop-blur-xl bg-white/90 ring-1 ring-white/20">
        <CardHeader className="space-y-1 pb-8">
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Esqueceu sua senha?
          </CardTitle>
          <CardDescription className="text-center text-lg text-gray-600">
            Digite seu email para receber um link de redefinição
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100/80 p-1 rounded-xl">
              <TabsTrigger 
                value="paciente" 
                className="flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-200"
              >
                <User className="h-4 w-4" />
                <span className="font-medium">Paciente</span>
              </TabsTrigger>
              <TabsTrigger 
                value="clinica" 
                className="flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-200"
              >
                <Building2 className="h-4 w-4" />
                <span className="font-medium">Clínica</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-white/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Link de Redefinição"
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <Link 
              to={`/login?role=${activeTab}`} 
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
              Voltar ao login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ForgotPasswordForm
