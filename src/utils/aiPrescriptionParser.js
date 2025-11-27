export function parsePrescriptionToItems(text = "", posologiaText = "") {
  const items = []
  const norm = (s) => String(s || "").trim()
  const lines = norm(text)
    .split(/\r?\n|;|\.|\u2022|\-/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const freqFrom = (s) => {
    const t = String(s || "").toLowerCase()
    const m =
      t.match(/(\d+)\s*x\s*(ao\s*dia|dia)/) ||
      t.match(/(\d+)\s*vez(?:es)?\s*(ao\s*dia|dia)/) ||
      t.match(/(\d+)\/(\d+)\s*h/) ||
      t.match(/a\s*cada\s*(\d+)\s*h/) ||
      t.match(/(\d+)\s*h\/(\d+)\s*h/) ||
      t.match(/(\d+)\s*h/)
    if (!m) return undefined
    if (m[2] && /dia/.test(m[2])) return `${m[1]}x/dia`
    if (m[1] && m[2]) return `${m[1]}/${m[2]}h`
    if (m[1]) return `a cada ${m[1]}h`
    return undefined
  }

  const durFrom = (s) => {
    const t = String(s || "").toLowerCase()
    const m =
      t.match(/por\s*(\d+)\s*dias?/) ||
      t.match(/durante\s*(\d+)\s*dias?/) ||
      t.match(/por\s*(\d+)\s*semanas?/) ||
      t.match(/por\s*(\d+)\s*meses?/) ||
      t.match(/por\s*(\d+)\s*h/)
    if (!m) return undefined
    const num = m[1]
    if (/dia/.test(m[0])) return `${num} dias`
    if (/semana/.test(m[0])) return `${num} semanas`
    if (/mes/.test(m[0])) return `${num} meses`
    if (/h/.test(m[0])) return `${num} horas`
    return undefined
  }

  const doseFrom = (s) => {
    const t = String(s || "").toLowerCase()
    const m =
      t.match(/(\d+)\s*(comprimidos?|cp?s?)/) ||
      t.match(/(\d+)\s*(capsulas?|c[aá]psulas?)/) ||
      t.match(/(\d+)\s*ml/) ||
      t.match(/(\d+)\s*mg/) ||
      t.match(/(\d+)\s*g/) ||
      t.match(/(\d+)\s*gatas?|gotas?/)
    if (!m) return undefined
    return `${m[1]} ${m[2] ? m[2] : t.includes("ml") ? "ml" : t.includes("mg") ? "mg" : t.includes("g") ? "g" : ""}`.trim()
  }

  const nomeFrom = (s) => {
    const t = String(s || "").trim()
    const m = t.match(/^([A-Za-zÀ-ÿ0-9\-\s]+?)(?:\s+(\d+\s*(mg|ml|g)))?/)
    if (!m) return { descricao: t }
    const descricao = m[1].trim()
    const concentracao = m[2]?.trim()
    return { descricao, concentracao }
  }

  const globalFreq = freqFrom(posologiaText)
  const globalDur = durFrom(posologiaText)
  const globalDose = doseFrom(posologiaText)

  for (const raw of lines) {
    const { descricao, concentracao } = nomeFrom(raw)
    const dose = doseFrom(raw) || globalDose
    const frequencia = freqFrom(raw) || globalFreq
    const duracao = durFrom(raw) || globalDur
    const posologia = [dose, frequencia, duracao].filter(Boolean).join(" ") || norm(posologiaText)
    const observacoes = undefined
    const item = { descricao, dose, frequencia, duracao, posologia, observacoes }
    if (concentracao) item.concentracao = concentracao
    items.push(item)
  }

  if (items.length === 0 && norm(posologiaText)) {
    items.push({ descricao: norm(text), posologia: norm(posologiaText) })
  }

  return items
}
