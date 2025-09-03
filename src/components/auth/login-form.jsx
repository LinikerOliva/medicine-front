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

export function LoginForm() {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })
  const [loading, setLoading] = useState(false)

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
    <div className="min-h-screen bg-app-soft flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-app-lg border-0 backdrop-blur-sm bg-white/95">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-app-gradient rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-app-gradient">Entrar</CardTitle>
          <CardDescription className="text-center text-slate-600">
            Acesse sua conta no Portal Médico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="h-11 border-slate-200 focus:border-primary focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                className="h-11 border-slate-200 focus:border-primary focus:ring-primary/20"
              />
            </div>
            <Button type="submit" className="w-full h-11 bg-app-gradient hover:opacity-90 text-white font-semibold shadow-app" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          {/* Separador */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
            <span className="text-xs text-slate-500 font-medium">ou</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
          </div>

          {/* Botão do Google */}
          <div className="flex justify-center">
            <div ref={googleBtnRef} className="w-full flex justify-center" />
          </div>

          {/* Fallback simples caso o script não tenha carregado ainda */}
          {!window.google && (
            <Button type="button" variant="outline" className="w-full h-11 border-slate-200 hover:bg-slate-50" disabled>
              {loadingGoogle ? "Conectando..." : "Continuar com Google"}
            </Button>
          )}

          <div className="text-center space-y-2">
            <Link to="/esqueci-senha" className="text-sm text-sky-500 hover:text-sky-600 hover:underline">
              Esqueceu sua senha?
            </Link>
            <div className="text-sm text-slate-600">
              Não tem uma conta?{" "}
              <Link to="/registrar" className="text-sky-500 hover:text-sky-600 hover:underline font-medium">
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
