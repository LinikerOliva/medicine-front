export const aiService = {
  // Sumariza uma transcrição de consulta usando a API do Google Gemini via fetch
  async sumarizarTranscricao(transcricao, contexto = {}) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) throw new Error("VITE_GEMINI_API_KEY não configurada")

    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

    const systemPrompt = [
      "Você é um assistente médico que lê a transcrição de uma consulta e retorna um resumo estruturado.",
      "Responda em JSON estrito com as chaves:",
      "{",
      "  \"queixa\": string,",
      "  \"historia_doenca_atual\": string,",
      "  \"diagnostico_principal\": string,",
      "  \"conduta\": string,",
      "  \"medicamentos\": string,",
      "  \"posologia\": string,",
      "  \"alergias\": string",
      "}",
      "Se algum dado não estiver na transcrição, deixe a string vazia."
    ].join("\n")

    const payload = {
      contents: [
        { role: "user", parts: [{ text: `${systemPrompt}\n\nContexto prévio (opcional): ${JSON.stringify(contexto)}\n\nTranscrição:\n${transcricao || ""}` }] }
      ]
    }

    const res = await fetch(`${endpoint}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`Gemini HTTP ${res.status}: ${text}`)
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
    // Tenta extrair JSON do retorno do modelo
    try {
      const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || text
      return JSON.parse(jsonStr)
    } catch (_) {
      return { summary_text: text }
    }
  }
}