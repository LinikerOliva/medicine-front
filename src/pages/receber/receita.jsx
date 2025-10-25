import React, { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import api from "@/services/api"
import { pacienteService } from "@/services/pacienteService"

// Página pública para receber/baixar receita via link de e-mail
// Aceita query params: id, token, url
export default function ReceberReceita() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("ready")
  const [error, setError] = useState(null)
  const [downloaded, setDownloaded] = useState(false)

  const params = useMemo(() => {
    const u = new URL(window.location.href)
    return {
      id: u.searchParams.get("id") || u.searchParams.get("receita") || u.searchParams.get("receita_id"),
      token: u.searchParams.get("token") || u.searchParams.get("t"),
      url: u.searchParams.get("url") || u.searchParams.get("download") || u.searchParams.get("arquivo") || null,
      email: u.searchParams.get("email") || null,
    }
  }, [location.search])

  const ensurePdfExt = (name) => {
    try {
      const base = name.replace(/\?.*$/, "")
      return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`
    } catch {
      return "Receita.pdf"
    }
  }

  const downloadBlob = (blob, filename) => {
    const link = document.createElement("a")
    const objUrl = URL.createObjectURL(blob)
    link.href = objUrl
    link.download = decodeURIComponent(filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(objUrl), 2000)
  }

  const tryDirectUrlDownload = async (urlLike) => {
    let url = urlLike
    if (!url) return false
    try {
      // Se relativo, prefixa com API base
      if (!/^https?:\/\//i.test(url)) {
        const base = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "")
        url = `${base}${url.startsWith("/") ? "" : "/"}${url}`
      }
      const res = await api.get(url, { responseType: "blob", baseURL: "" })
      const blob = new Blob([res.data], { type: res.headers["content-type"] || "application/pdf" })
      const cd = res.headers["content-disposition"] || ""
      const match = /filename\*=UTF-8''([^;]+)|filename="?([^\";]+)"?/i.exec(cd)
      let filename = match?.[1] || match?.[2] || "Receita.pdf"
      filename = ensurePdfExt(filename)
      downloadBlob(blob, filename)
      return true
    } catch (e) {
      console.warn("[ReceberReceita] download direto falhou:", e?.response?.status || e)
      return false
    }
  }

  const tryFetchById = async (id) => {
    if (!id) return false
    try {
      // Tenta carregar receitas do paciente e encontrar a que corresponde ao ID
      const data = await pacienteService.getReceitas({ __propagateErrors: true })
      const list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
      const found = list.find((r) => String(r.id || r.pk || r.uuid) === String(id))
      const url = found?.arquivo_assinado || found?.pdf || found?.documento || null
      if (!url) return false
      return await tryDirectUrlDownload(url)
    } catch (e) {
      console.warn("[ReceberReceita] busca por ID falhou:", e?.response?.status || e)
      return false
    }
  }

  const handleReceive = async () => {
    setLoading(true)
    setError(null)
    setStatus("processing")
    try {
      // 1) Tenta baixar direto por URL
      if (await tryDirectUrlDownload(params.url)) {
        setDownloaded(true)
        setStatus("done")
        toast({ title: "Receita baixada", description: "O PDF foi baixado com sucesso." })
        return
      }
      // 2) Tenta buscar por ID e baixar
      if (await tryFetchById(params.id)) {
        setDownloaded(true)
        setStatus("done")
        toast({ title: "Receita baixada", description: "O PDF foi baixado com sucesso." })
        return
      }
      // 3) Falha: orientar usuário
      setStatus("error")
      setError("Não foi possível localizar a receita. Verifique se o link não expirou ou faça login para acessá-la.")
      toast({ title: "Link inválido", description: "Não foi possível localizar a receita.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Auto-processar ao abrir se houver parâmetros
    if (params.url || params.id) {
      handleReceive()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.url, params.id])

  return (
    <div className="p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Receber Receita</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "done" ? (
              <div className="flex items-center gap-2 text-green-700">
                <Badge variant="outline">Concluído</Badge>
                <span>O download da receita foi iniciado.</span>
              </div>
            ) : status === "processing" ? (
              <div className="flex items-center gap-2 text-blue-700">
                <Badge variant="outline">Processando</Badge>
                <span>Estamos validando seu link e preparando o download...</span>
              </div>
            ) : status === "error" ? (
              <div className="text-red-700">
                <Badge variant="destructive" className="mb-2">Erro</Badge>
                <p className="text-sm">{error || "Falha ao processar o link."}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Cole o link recebido por e-mail, ou utilize o acesso direto com login.</p>
            )}

            <div className="space-y-2">
              <Label>Link direto do arquivo (opcional)</Label>
              <Input defaultValue={params.url || ""} placeholder="https://.../receita.pdf" onBlur={(e) => {
                const u = new URL(window.location.href)
                if (e.target.value) u.searchParams.set("url", e.target.value)
                else u.searchParams.delete("url")
                navigate({ pathname: u.pathname, search: u.search })
              }} />
            </div>
            <div className="space-y-2">
              <Label>ID da Receita (opcional)</Label>
              <Input defaultValue={params.id || ""} placeholder="123" onBlur={(e) => {
                const u = new URL(window.location.href)
                if (e.target.value) u.searchParams.set("id", e.target.value)
                else u.searchParams.delete("id")
                navigate({ pathname: u.pathname, search: u.search })
              }} />
            </div>

            <div className="flex gap-2 justify-end">
              <Button onClick={handleReceive} disabled={loading}>{loading ? "Processando..." : "Receber"}</Button>
              <Button variant="outline" onClick={() => navigate("/paciente/receitas")}>Ir para Minhas Receitas</Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground">
          Dica: se o link tiver expirado, faça login e acesse suas receitas na área do paciente.
        </div>
      </div>
    </div>
  )
}