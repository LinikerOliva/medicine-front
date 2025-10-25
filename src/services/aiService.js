export const aiService = {
  // Fallback local: sumarização heurística quando a chave de IA não está disponível
  _summarizeLocal(transcricao = "", contexto = {}) {
    const text = String(transcricao || "").replace(/\r/g, "").trim()
    const readSection = (labels) => {
      const rx = new RegExp(
        `(?:^|\n)\s*(?:${labels.join("|")})\s*[:：]\s*([\s\S]*?)(?=\n\s*(?:Queixa|História|Historia|Exame|Diagn[oó]stico|Conduta|Prescri|Rx|Receita|Alergias|Orient[aã]ções|Observ[aã]ções|Retorno)\s*[:：]|$)`,
        "i"
      )
      const m = text.match(rx)
      return m ? m[1].trim() : ""
    }

    const queixa = readSection(["Queixa", "Queixa Principal"]) || text.split(/\n\n|\n-/)[0]?.slice(0, 300) || ""
    const historia = readSection(["História", "Historia", "HDA", "História da Doença Atual"]) || ""
    const diagnostico = readSection(["Diagnóstico", "Diagnostico"]) || ""
    const conduta = readSection(["Conduta", "Plano", "Plano Terapêutico"]) || ""

    const prescricao = readSection(["Prescrição", "Prescricao", "Receita", "Rx"]) || ""
    let medicamentos = ""
    let posologia = ""
    if (prescricao) {
      const lines = prescricao.split(/\n+/).map((l) => l.trim()).filter(Boolean)
      if (lines.length === 1) {
        medicamentos = lines[0]
        posologia = "Conforme descrito na prescrição."
      } else if (lines.length > 1) {
        medicamentos = lines[0]
        posologia = lines.slice(1).join(" ")
      }
    }
    if (!medicamentos && conduta) {
      const medLine = (conduta.match(/.+?(\d+\s?(mg|ml|g|mcg)|comprimid|c[aá]psul|gotas).*/i) || [""])[0]
      if (medLine) {
        medicamentos = medLine.trim()
        posologia = "Conforme conduta descrita."
      }
    }

    const alergias = readSection(["Alergias"]) || String(contexto?.alergias || "")

    const pressao = (text.match(/(PA|press[aã]o( arterial)?)[^\d]*(\d{2,3}\s*\/\s*\d{2,3})\s*(mmhg)?/i) || ["", "", "", ""])[3] || ""
    const frequencia = (text.match(/(FC|freq[uê]ncia\s*card[ií]aca)[^\d]*(\d{2,3})\s*(bpm)?/i) || ["", "", ""])[2] || ""
    const temperatura = (text.match(/(temp(eratura)?)[^\d]*(\d{2}(?:[\.,]\d)?)\s*(?:°?c|celsius)?/i) || ["", "", "", ""])[3] || ""
    const saturacao = (text.match(/(sat|satura[cç][aã]o)[^\d]*(\d{2})\s*%/i) || ["", "", ""])[2] || ""

    return {
      queixa: queixa || String(contexto?.queixa || ""),
      historia_doenca_atual: historia || String(contexto?.historia_doenca_atual || contexto?.historia || ""),
      diagnostico_principal: diagnostico || String(contexto?.diagnostico_principal || contexto?.diagnostico || ""),
      conduta: conduta || String(contexto?.conduta || ""),
      medicamentos: medicamentos || String(contexto?.medicamentos || ""),
      posologia: posologia || String(contexto?.posologia || ""),
      alergias: String(alergias || ""),
      pressao,
      frequencia_cardiaca: frequencia,
      temperatura,
      saturacao,
    }
  },

  // Fallback local: extração de entidades com regras simples
  _extractEntitiesLocal(transcricao = "", contexto = {}) {
    const sum = this._summarizeLocal(transcricao, contexto)
    const text = String(transcricao || "").replace(/\r/g, "").trim()

    const readSection = (labels) => {
      const rx = new RegExp(
        `(?:^|\n)\s*(?:${labels.join("|")})\s*[:：]\s*([\s\S]*?)(?=\n\s*(?:Queixa|História|Historia|Exame|Diagn[oó]stico|Conduta|Prescri|Rx|Receita|Alergias|Sintomas|Orient[aã]ções|Observ[aã]ções|Retorno|Exames)\s*[:：]|$)`,
        "i"
      )
      const m = text.match(rx)
      return m ? m[1].trim() : ""
    }

    const sintomasSec = readSection(["Sintomas"]) || ""
    const orientSec = readSection(["Orientações", "Orientacoes"]) || ""
    const obsSec = readSection(["Observações", "Observacoes"]) || ""
    const examesSec = readSection(["Exames"]) || ""
    const alergiasSec = sum.alergias || readSection(["Alergias"]) || ""

    const sintomas = sintomasSec
      ? sintomasSec.split(/[,\n;]+/).map((s) => s.trim()).filter(Boolean)
      : []

    const orientacoes = orientSec
      ? orientSec.split(/\n+/).map((s) => s.trim()).filter(Boolean)
      : []

    const alergias = alergiasSec
      ? alergiasSec.split(/[,\n;]+/).map((s) => s.trim()).filter(Boolean)
      : []

    const exames = examesSec
      ? examesSec.split(/[,\n;]+/).map((s) => s.trim()).filter(Boolean)
      : []

    // Heurística simples para medicamentos: cada linha que pareça uma prescrição
    const medLines = []
    if (sum.medicamentos) medLines.push(...String(sum.medicamentos).split(/\n+/))
    const meds = medLines
      .map((line) => String(line).trim())
      .filter((l) => /\b(mg|ml|g|mcg|comprimid|capsul|gota|spray)\b/i.test(l))
      .map((l) => ({
        nome: l.split(/\s+/)[0] || "",
        dosagem: (l.match(/\b\d+\s?(mg|ml|g|mcg)\b/i) || [""])[0],
        frequencia: (l.match(/\b(\d+x\s*ao\s*d[ií]a|\d+x\/dia|[aá] cada \d+ h)\b/i) || [""])[0],
        duracao: (l.match(/\bpor\s*\d+\s*(dias?|semanas?|meses?)\b/i) || [""])[0],
        via: (l.match(/\b(via\s*oral|vo|im|ev)\b/i) || [null])[0],
        observacoes: l,
      }))

    const entidades = {
      paciente: { nome: "", idade: null, sexo: null },
      diagnostico: sum.diagnostico_principal || "",
      sintomas,
      medicamentos: meds,
      orientacoes,
      observacoes: obsSec || sum.conduta || "",
      sinais_vitais: {
        pressao: sum.pressao || "",
        frequencia_cardiaca: sum.frequencia_cardiaca || "",
        temperatura: sum.temperatura || "",
        saturacao: sum.saturacao || "",
      },
      alergias,
      exames,
      retorno: null,
    }

    return entidades
  },

  // Sumariza uma transcrição usando Gemini; se indisponível, usa fallback local
  async sumarizarTranscricao(transcricao, contexto = {}) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

    if (!apiKey) {
      return this._summarizeLocal(transcricao, contexto)
    }

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
      "  \"alergias\": string,",
      "  \"pressao\": string,",
      "  \"frequencia_cardiaca\": string,",
      "  \"temperatura\": string,",
      "  \"saturacao\": string",
      "}",
      "Formate as unidades quando possível (ex.: 120/80 mmHg, 75 bpm, 36.5 °C, 98%).",
      "Se algum dado não estiver na transcrição, deixe a string vazia.",
    ].join("\n")

    const payload = {
      contents: [
        { role: "user", parts: [{ text: `${systemPrompt}\n\nContexto prévio (opcional): ${JSON.stringify(contexto)}\n\nTranscrição:\n${transcricao || ""}` }] },
      ],
    }

    try {
      const res = await fetch(`${endpoint}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`Gemini HTTP ${res.status}: ${text}`)
      }

      const data = await res.json()
      const textOut = data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
      try {
        const jsonStr = textOut.match(/\{[\s\S]*\}/)?.[0] || textOut
        const parsed = JSON.parse(jsonStr)
        // Garantir chaves esperadas
        return {
          queixa: parsed.queixa || "",
          historia_doenca_atual: parsed.historia_doenca_atual || parsed.historia || "",
          diagnostico_principal: parsed.diagnostico_principal || parsed.diagnostico || "",
          conduta: parsed.conduta || "",
          medicamentos: parsed.medicamentos || "",
          posologia: parsed.posologia || "",
          alergias: parsed.alergias || "",
          pressao: parsed.pressao || "",
          frequencia_cardiaca: parsed.frequencia_cardiaca || "",
          temperatura: parsed.temperatura || "",
          saturacao: parsed.saturacao || "",
        }
      } catch (_) {
        // Se falhou parsing, usa fallback local
        return this._summarizeLocal(transcricao, contexto)
      }
    } catch (_) {
      // Gemini indisponível: usar fallback local
      return this._summarizeLocal(transcricao, contexto)
    }
  },

  // Extrai entidades clínicas; se Gemini indisponível, usa heurística local
  async extrairEntidades(transcricao, contexto = {}) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

    if (!apiKey) {
      return this._extractEntitiesLocal(transcricao, contexto)
    }

    const schemaPrompt = [
      "Você é um assistente médico. Extraia entidades clínicas da transcrição e retorne APENAS JSON válido seguindo este modelo:",
      "{",
      "  \"paciente\": { \"nome\": string, \"idade\": number|null, \"sexo\": string|null },",
      "  \"diagnostico\": string,",
      "  \"sintomas\": [string],",
      "  \"medicamentos\": [",
      "    { \"nome\": string, \"dosagem\": string, \"frequencia\": string, \"duracao\": string, \"via\": string|null, \"observacoes\": string|null }",
      "  ],",
      "  \"orientacoes\": [string],",
      "  \"observacoes\": string,",
      "  \"sinais_vitais\": { \"pressao\": string, \"frequencia_cardiaca\": string, \"temperatura\": string, \"saturacao\": string },",
      "  \"alergias\": [string],",
      "  \"exames\": [string],",
      "  \"retorno\": string|null",
      "}",
      "Regras:",
      "- Mantenha strings vazias quando a informação não existir.",
      "- NUNCA inclua texto fora do JSON.",
      "- Use unidades padrão (mmHg, bpm, °C, %).",
      "- Se não houver medicamentos, retorne uma lista vazia.",
    ].join("\n")

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${schemaPrompt}\n\nContexto auxiliar (opcional): ${JSON.stringify(contexto)}\n\nTranscrição:\n${transcricao || ""}` }],
        },
      ],
    }

    try {
      const res = await fetch(`${endpoint}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`Gemini HTTP ${res.status}: ${text}`)
      }

      const data = await res.json()
      const textOut = data?.candidates?.[0]?.content?.parts?.[0]?.text || ""

      try {
        const jsonStr = textOut.match(/\{[\s\S]*\}/)?.[0] || textOut
        const parsed = JSON.parse(jsonStr)
        const norm = {
          paciente: parsed.paciente || { nome: "", idade: null, sexo: null },
          diagnostico: typeof parsed.diagnostico === "string" ? parsed.diagnostico : parsed.diagnostico_principal || "",
          sintomas: Array.isArray(parsed.sintomas) ? parsed.sintomas : [],
          medicamentos: Array.isArray(parsed.medicamentos)
            ? parsed.medicamentos.map((m) => ({
                nome: String(m?.nome || "").trim(),
                dosagem: String(m?.dosagem || "").trim(),
                frequencia: String(m?.frequencia || "").trim(),
                duracao: String(m?.duracao || "").trim(),
                via: m?.via ? String(m.via).trim() : null,
                observacoes: m?.observacoes ? String(m.observacoes).trim() : null,
              }))
            : [],
          orientacoes: Array.isArray(parsed.orientacoes) ? parsed.orientacoes : [],
          observacoes: typeof parsed.observacoes === "string" ? parsed.observacoes : "",
          sinais_vitais: {
            pressao: parsed?.sinais_vitais?.pressao || parsed?.pressao || "",
            frequencia_cardiaca: parsed?.sinais_vitais?.frequencia_cardiaca || parsed?.frequencia_cardiaca || "",
            temperatura: parsed?.sinais_vitais?.temperatura || parsed?.temperatura || "",
            saturacao: parsed?.sinais_vitais?.saturacao || parsed?.saturacao || "",
          },
          alergias: Array.isArray(parsed.alergias) ? parsed.alergias : [],
          exames: Array.isArray(parsed.exames) ? parsed.exames : [],
          retorno: parsed.retorno ?? null,
        }
        return norm
      } catch (_) {
        // Parsing falhou: usar heurística local
        return this._extractEntitiesLocal(transcricao, contexto)
      }
    } catch (_) {
      // Gemini indisponível: usar heurística local
      return this._extractEntitiesLocal(transcricao, contexto)
    }
  },
}