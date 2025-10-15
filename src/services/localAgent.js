import api from "./api"

// Serviço de integração com o Agente Local (PKCS#11) para assinatura A3
// Este serviço não armazena PIN nem certifica persistência de chaves privadas.
// Toda comunicação deve ocorrer via TLS quando disponível.

const ensureBaseUrl = () => {
  const raw = (import.meta.env.VITE_LOCAL_AGENT_URL || "http://localhost:18080").trim()
  if (!raw) return "http://localhost:18080"
  return raw.endsWith("/") ? raw.slice(0, -1) : raw
}

const parseFilename = (contentDisposition, fallback = "documento_assinado.pdf") => {
  if (!contentDisposition) return fallback
  const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(contentDisposition)
  try {
    return decodeURIComponent(match?.[1] || match?.[2] || fallback)
  } catch {
    return match?.[1] || match?.[2] || fallback
  }
}

async function safeJson(res) {
  try { return await res.json() } catch { return null }
}

export const localAgent = {
  // Detecta tokens conectados. Retorna { tokens: [...], status: 'ok' } ou { tokens: [], status: 'error' }
  async detectTokens() {
    const base = ensureBaseUrl()
    // Preferir POST /local-sign { action: 'detect' }
    try {
      const r = await fetch(`${base}/local-sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ action: "detect" }),
        // Não enviar credenciais; agente valida origin/JWT localmente
        credentials: "omit",
        mode: "cors",
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const j = await safeJson(r)
      if (Array.isArray(j?.tokens)) return { status: "ok", tokens: j.tokens }
      // Alguns agentes podem retornar { certs: [...] }
      if (Array.isArray(j?.certs)) return { status: "ok", tokens: j.certs }
      return { status: "ok", tokens: [] }
    } catch {
      // Fallbacks comuns
      for (const path of ["/tokens", "/certs", "/local/tokens"]) {
        try {
          const r2 = await fetch(`${base}${path}`, { headers: { "Accept": "application/json" }, credentials: "omit", mode: "cors" })
          if (!r2.ok) continue
          const j2 = await safeJson(r2)
          if (Array.isArray(j2)) return { status: "ok", tokens: j2 }
          if (Array.isArray(j2?.tokens)) return { status: "ok", tokens: j2.tokens }
          if (Array.isArray(j2?.certs)) return { status: "ok", tokens: j2.certs }
        } catch {}
      }
      return { status: "error", tokens: [] }
    }
  },

  // Solicita assinatura do hash ao agente local. Retorna objeto de sucesso/erro.
  async signHash({ document_hash, format = "PAdES", prefer_certificate = null, pin }) {
    const base = ensureBaseUrl()
    const payload = { action: "sign", document_hash, format, prefer_certificate }
    // Opcionalmente incluir PIN (se política permitir). Não persiste nem loga.
    if (pin && String(pin).length > 0) payload.pin = String(pin)
    const res = await fetch(`${base}/local-sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
      credentials: "omit",
      mode: "cors",
    })
    const j = await safeJson(res)
    if (!res.ok) {
      return j || { status: "error", code: `HTTP_${res.status}`, message: "Falha ao assinar via agente local." }
    }
    return j || { status: "error", code: "INVALID_RESPONSE", message: "Resposta inválida do agente local." }
  },

  // Envia assinatura + certificado ao backend para finalizar PAdES e retornar PDF assinado
  async finalizeWithBackend({ receitaId, pdfFile, assinatura, certificado, thumbprint, cert_subject, timestamp, hash_pre }) {
    const fd = new FormData()
    if (pdfFile) {
      fd.append("file", pdfFile)
      fd.append("documento", pdfFile)
      fd.append("pdf", pdfFile)
    }
    if (receitaId) {
      fd.append("receita", receitaId)
      fd.append("receita_id", receitaId)
      fd.append("id", receitaId)
    }
    if (assinatura) fd.append("assinatura", assinatura)
    if (certificado) fd.append("certificado", certificado)
    if (thumbprint) fd.append("thumbprint", thumbprint)
    if (cert_subject) fd.append("cert_subject", cert_subject)
    if (timestamp) fd.append("timestamp", timestamp)
    if (hash_pre) fd.append("hash_pre", hash_pre)
    fd.append("hash_alg", "SHA-256")
    fd.append("assinatura_externa", "true")

    const candidates = []
    const envFinalize = (import.meta.env.VITE_FINALIZAR_ASSINATURA_EXTERNA || "").trim()
    if (envFinalize) candidates.push(envFinalize)

    const baseReceitasRaw = import.meta.env.VITE_RECEITAS_ENDPOINT || "/receitas/"
    const baseReceitas = baseReceitasRaw.endsWith("/") ? baseReceitasRaw : `${baseReceitasRaw}/`

    // Endpoints comuns
    candidates.push("/api/assinatura/finalizar/")
    candidates.push("/assinatura/finalizar/")
    candidates.push("/documentos/assinar_externo/")
    candidates.push("/assinatura/externa/finalizar/")
    candidates.push(`${baseReceitas}finalizar_assinatura_externa/")
    if (receitaId) {
      candidates.push(`${baseReceitas}${receitaId}/finalizar_assinatura_externa/")
    }

    let lastErr = null
    for (const raw of candidates) {
      if (!raw) continue
      const url = raw.endsWith("/") ? raw : `${raw}/`
      try {
        const res = await api.post(url, fd, { responseType: "blob" })
        const cd = res.headers?.["content-disposition"] || res.headers?.get?.("content-disposition")
        const filename = parseFilename(cd)
        const blob = new Blob([res.data], { type: res.headers?.["content-type"] || "application/pdf" })
        return { filename, blob }
      } catch (e) {
        const st = e?.response?.status
        if (st === 404 || st === 405) { lastErr = e; continue }
        if (st && [400, 422].includes(st)) throw e
        lastErr = e
      }
    }
    if (lastErr) throw lastErr
    throw new Error("Nenhum endpoint compatível para finalizar assinatura externa.")
  },
}

export default localAgent