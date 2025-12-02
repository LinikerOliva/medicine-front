"use client"

import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Button } from "../ui/button"
import { Separator } from "../ui/separator"
import { Lock, CheckCircle2, ArrowLeft, ShieldCheck } from "lucide-react"
import { useToast } from "../../hooks/use-toast"
import api from "../../services/api"

export default function ResetPasswordForm() {
  const { uid, token } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Base do backend para fallback de redirecionamento
  const backendBase = useMemo(() => {
    const base = import.meta.env.VITE_BACKEND_BASE_URL || import.meta.env.VITE_API_URL || ""
    return String(base).replace(/\/$/, "")
  }, [])

  const confirmApi = import.meta.env.VITE_RESET_PASSWORD_CONFIRM_API

  const confirmUrl = `${backendBase}/reset/${uid}/${token}/`

  // Validação simples em client-side
  const validate = () => {
    if (!password || password.length < 8) {
      toast({
        title: "Senha muito curta",
        description: "Use pelo menos 8 caracteres.",
        variant: "destructive",
      })
      return false
    }
    if (password !== confirm) {
      toast({
        title: "Confirmação",
        description: "A confirmação não confere com a nova senha.",
        variant: "destructive",
      })
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (!validate()) return

    setSubmitting(true)
    try {
      const endpoints = []
      if (confirmApi) endpoints.push(confirmApi)
      endpoints.push("/api/auth/password_reset_confirm/")
      endpoints.push("/api/password_reset/confirm/")
      endpoints.push("/api/auth/password/reset/confirm/")

      const payloads = [
        { uid, token, new_password: password },
        { uid, token, new_password1: password, new_password2: confirm },
        { uid, token, password: password, confirm_password: confirm },
        { token, password: password },
      ]

      let success = false
      for (const ep of endpoints) {
        for (const body of payloads) {
          try {
            await api.post(ep, body)
            success = true
            break
          } catch (err) {
            const st = err?.response?.status
            if (st === 401) throw err
          }
        }
        if (success) break
      }

      if (success) {
        toast({ title: "Senha redefinida!", description: "Você já pode fazer login." })
        navigate("/login")
      } else {
        window.location.href = confirmUrl
      }
    } catch (error) {
      const msg = error?.response?.data?.detail || error?.response?.data?.message || error?.message
      toast({ title: "Não foi possível redefinir", description: msg || "Tente novamente.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5"></div>
      <Card className="relative w-full max-w-md shadow-2xl border-0 backdrop-blur-xl bg-white/90 ring-1 ring-white/20">
        <CardHeader className="space-y-1 text-center pb-8">
          <div className="mx-auto w-16 h-16 bg-medical-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-medical-primary">Redefinir senha</CardTitle>
          <CardDescription className="text-slate-600 text-base">
            Crie uma nova senha para sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Nova senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 input-medical-primary bg-white/80 backdrop-blur-sm transition-all duration-200"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-slate-700 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Confirmar nova senha
              </Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-12 input-medical-primary bg-white/80 backdrop-blur-sm transition-all duration-200"
                required
              />
            </div>

            <Button type="submit" className="w-full h-12 btn-medical-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200" disabled={submitting}>
              {submitting ? "Processando..." : "Redefinir minha senha"}
            </Button>
          </form>

          {/* Removido: bloco com link para página do backend */}

          <Button
            variant="ghost"
            className="w-full h-12 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200 mt-2"
            onClick={() => navigate("/login")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao login
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
