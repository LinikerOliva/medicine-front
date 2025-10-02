"use client"

import { useState, useEffect, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { useAuth } from "../../contexts/auth-context"
import { useToast } from "../../hooks/use-toast"
import { useTheme } from "../theme-provider"
import { Stethoscope, Mail, Lock, Eye, EyeOff } from "lucide-react"

export function LoginForm() {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { login, loginWithGoogle } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data = await login(formData)

      toast({
        title: "Login realizado com sucesso!",
        // Usa informações disponíveis do backend atual
        description: `Bem-vindo, ${data.user?.first_name || data.user?.username || data.user?.email || "usuário"}!`,
      })

      // Redirecionar baseado no tipo de usuário: usa role do backend (fallback ao tipo antigo)
      const role = data.user?.role || data.user?.tipo
      switch (role) {
        case "medico":
          navigate("/medico/dashboard")
          break
        case "paciente":
          navigate("/paciente/perfil")
          break
        case "clinica":
          navigate("/clinica/dashboard")
          break
        case "admin":
          navigate("/admin/dashboard")
          break
        default:
          navigate("/")
      }
    } catch (error) {
      const backendMsg = error.response?.data?.error || error.response?.data?.detail || error.response?.data?.message
      toast({
        title: "Erro no login",
        description: backendMsg || "Credenciais inválidas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  // Google Sign-In
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const googleBtnRef = useRef(null)

  const { setTheme, theme } = useTheme()
  const prevThemeRef = useRef(null)

  useEffect(() => {
    prevThemeRef.current = theme
    setTheme("light")
    return () => {
      if (prevThemeRef.current) setTheme(prevThemeRef.current)
    }
  }, [theme, setTheme])
  
  useEffect(() => {
    if (window.google && googleBtnRef.current) {
      try {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: async (response) => {
            const credential = response?.credential
            if (!credential) return
            setLoadingGoogle(true)
            try {
              const data = await loginWithGoogle(credential)
              toast({
                title: "Login com Google realizado!",
                description: `Bem-vindo, ${data.user?.nome || data.user?.first_name || data.user?.username || data.user?.email || "usuário"}!`,
              })
              const role = data.user?.role || data.user?.tipo
              switch (role) {
                case "medico":
                  navigate("/medico/dashboard")
                  break
                case "paciente":
                  navigate("/paciente/perfil")
                  break
                case "clinica":
                  navigate("/clinica/dashboard")
                  break
                case "admin":
                  navigate("/admin/dashboard")
                  break
                default:
                  navigate("/")
              }
            } catch (error) {
              toast({
                title: "Erro no login com Google",
                description: error.response?.data?.message || "Não foi possível autenticar",
                variant: "destructive",
              })
            } finally {
              setLoadingGoogle(false)
            }
          },
        })

        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: 320,
        })
      } catch (e) {
        // silencioso
      }
    }
  }, [loginWithGoogle, navigate, toast])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-blue-600/20 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-0 backdrop-blur-xl bg-white/90 relative z-10">
        <CardHeader className="space-y-1 text-center pb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Portal Médico
          </CardTitle>
          <CardDescription className="text-slate-600 text-base">
            Acesse sua conta para continuar
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white/80 backdrop-blur-sm transition-all duration-200"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white/80 backdrop-blur-sm transition-all duration-200 pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400" />
                  )}
                </Button>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Entrando...
                </div>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          {/* Separador */}
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
            <span className="text-sm text-slate-500 font-medium bg-white px-2">ou</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
          </div>

          {/* Botão do Google */}
          <div className="flex justify-center">
            <div ref={googleBtnRef} className="w-full flex justify-center" />
          </div>

          {/* Fallback simples caso o script não tenha carregado ainda */}
          {!window.google && (
            <Button 
              type="button" 
              variant="outline" 
              className="w-full h-12 border-slate-200 hover:bg-slate-50 bg-white/80 backdrop-blur-sm transition-all duration-200" 
              disabled
            >
              {loadingGoogle ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin"></div>
                  Conectando...
                </div>
              ) : (
                "Continuar com Google"
              )}
            </Button>
          )}

          <div className="text-center space-y-3 pt-4">
            <Link 
              to="/esqueci-senha" 
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors duration-200"
            >
              Esqueceu sua senha?
            </Link>
            <div className="text-sm text-slate-600">
              Não tem uma conta?{" "}
              <Link 
                to="/registrar" 
                className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors duration-200"
              >
                Cadastre-se
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginForm
