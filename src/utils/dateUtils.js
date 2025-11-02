/**
 * Utilitários para formatação de datas
 */

const DEFAULT_TZ = (import.meta?.env?.VITE_TIMEZONE || "America/Sao_Paulo").trim()

function fmtDate(date, opts = {}) {
  try {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: DEFAULT_TZ, ...opts }).format(date)
  } catch {
    return "—"
  }
}

/**
 * Formata uma data para exibição em português brasileiro
 * Corrige o problema de fuso horário que fazia as datas aparecerem um dia antes
 * @param {string|Date} dateStr - String da data ou objeto Date
 * @returns {string} Data formatada em pt-BR ou "—" se inválida
 */
export const formatDateBR = (dateStr) => {
  if (!dateStr) return "—"
  
  try {
    // Se a string contém apenas a data (YYYY-MM-DD), evita criar Date em UTC
    let date
    if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Para exibição pura de data, não depende de timezone
      const [year, month, day] = dateStr.split('-')
      return `${day}/${month}/${year}`
    } else {
      date = new Date(dateStr)
    }
    
    if (isNaN(date.getTime())) return "—"
    return fmtDate(date, { year: "numeric", month: "2-digit", day: "2-digit" })
  } catch {
    return "—"
  }
}

export const formatTimeBR = (dateStr) => {
  if (!dateStr) return "—"
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return "—"
    return fmtDate(d, { hour: "2-digit", minute: "2-digit" })
  } catch {
    return "—"
  }
}

export const formatDateTimeBR = (dateStr) => {
  if (!dateStr) return "—"
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return "—"
    const date = fmtDate(d, { year: "numeric", month: "2-digit", day: "2-digit" })
    const time = fmtDate(d, { hour: "2-digit", minute: "2-digit" })
    return `${date} ${time}`
  } catch {
    return "—"
  }
}

/**
 * Calcula a idade baseada na data de nascimento
 * @param {string|Date} dateStr - Data de nascimento
 * @returns {string|null} Idade formatada ou null se inválida
 */
export const calcAge = (dateStr) => {
  if (!dateStr) return null
  
  try {
    let dob
    if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-').map(Number)
      dob = new Date(year, month - 1, day)
    } else {
      dob = new Date(dateStr)
    }
    
    if (isNaN(dob.getTime())) return null
    
    const today = new Date()
    let years = today.getFullYear() - dob.getFullYear()
    const monthDiff = today.getMonth() - dob.getMonth()
    const dayDiff = today.getDate() - dob.getDate()
    
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      years--
    }
    
    let lastBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
    if (lastBirthday > today) {
      lastBirthday = new Date(today.getFullYear() - 1, dob.getMonth(), dob.getDate())
    }
    
    const msPerDay = 24 * 60 * 60 * 1000
    const days = Math.floor((today - lastBirthday) / msPerDay)
    
    return `${years} anos e ${days} dias`
  } catch {
    return null
  }
}