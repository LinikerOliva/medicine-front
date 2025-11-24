import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveDoctorLogo, loadDoctorLogo } from "@/utils/pdfTemplateUtils"
import { medicoService } from "@/services/medicoService"

export default function BrandWebView() {
  const defaultName = import.meta.env.VITE_BRAND_NAME || import.meta.env.VITE_APP_NAME || "Trathea"
  const [brandName, setBrandName] = useState(() => localStorage.getItem("brand_name") || defaultName)
  const [siteUrl, setSiteUrl] = useState(() => localStorage.getItem("brand_site_url") || (import.meta.env.VITE_BRAND_SITE_URL || ""))
  const [logo, setLogo] = useState(() => {
    const envData = import.meta.env.VITE_BRAND_LOGO_DATA_URL
    if (envData && typeof envData === "string") return { data: envData }
    const stored = loadDoctorLogo("brand")
    return stored || null
  })

  useEffect(() => { try { localStorage.setItem("brand_name", brandName) } catch {} }, [brandName])
  useEffect(() => { try { localStorage.setItem("brand_site_url", siteUrl) } catch {} }, [siteUrl])

  const handleLogoUpload = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const saved = await saveDoctorLogo("brand", f)
      try {
        const mid = await medicoService._resolveMedicoId().catch(() => null)
        if (mid) await saveDoctorLogo(mid, f)
      } catch {}
      setLogo(saved)
    } catch {}
  }

  const validUrl = useMemo(() => {
    try {
      const u = new URL(siteUrl)
      return u.href
    } catch { return "" }
  }, [siteUrl])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Marca</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {logo?.data ? (
              <img src={logo.data} alt="Logo" className="h-16 w-16 object-contain rounded border" />
            ) : (
              <div className="h-16 w-16 rounded border flex items-center justify-center text-sm">Logo</div>
            )}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome da marca</Label>
                <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Trathea" />
              </div>
              <div>
                <Label>Logo</Label>
                <Input type="file" accept="image/*" onChange={handleLogoUpload} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Web View</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>URL do site</Label>
              <Input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://exemplo.com" />
            </div>
            <div className="flex items-end gap-2">
              <Button type="button" onClick={() => setSiteUrl(siteUrl.trim())} disabled={!siteUrl.trim()}>Carregar</Button>
              {validUrl ? (
                <a href={validUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
                  <Button type="button" variant="outline">Abrir em nova aba</Button>
                </a>
              ) : null}
            </div>
          </div>
          {validUrl ? (
            <div className="border rounded overflow-hidden">
              <div className="flex items-center gap-3 px-3 py-2 border-b bg-muted/40">
                {logo?.data ? <img src={logo.data} alt="Logo" className="h-6 w-6 object-contain" /> : null}
                <div className="font-semibold">{brandName}</div>
                <div className="text-xs text-muted-foreground ml-auto">{validUrl}</div>
              </div>
              <iframe title="brand-webview" src={validUrl} className="w-full h-[70vh]" />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Informe uma URL válida para exibir em web view.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}