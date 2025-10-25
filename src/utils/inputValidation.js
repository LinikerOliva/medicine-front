/**
 * Sistema de validação e sanitização de entrada
 * Previne ataques XSS e garante integridade dos dados
 */

// Padrões de validação comuns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  CPF: /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/,
  PHONE: /^(\+55\s?)?(\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  NAME: /^[a-zA-ZÀ-ÿ\s]{2,50}$/,
  CRM: /^\d{4,6}\/[A-Z]{2}$/,
  DATE: /^\d{4}-\d{2}-\d{2}$/,
  TIME: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
}

// Lista de tags HTML perigosas
const DANGEROUS_HTML_TAGS = [
  'script', 'iframe', 'object', 'embed', 'form', 'input', 'button',
  'link', 'meta', 'style', 'base', 'applet', 'body', 'html', 'head'
]

// Lista de atributos perigosos
const DANGEROUS_ATTRIBUTES = [
  'onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur',
  'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress',
  'javascript:', 'vbscript:', 'data:', 'src', 'href'
]

/**
 * Sanitiza string removendo caracteres perigosos
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') return input

  return input
    // Remove tags HTML perigosas
    .replace(/<\/?(?:script|iframe|object|embed|form|input|button|link|meta|style|base|applet)[^>]*>/gi, '')
    // Remove atributos de evento
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: e vbscript:
    .replace(/javascript:|vbscript:|data:/gi, '')
    // Remove caracteres de controle
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Limita tamanho
    .slice(0, 10000)
}

/**
 * Valida e sanitiza email
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email é obrigatório' }
  }

  const sanitized = sanitizeString(email.trim().toLowerCase())
  
  if (!VALIDATION_PATTERNS.EMAIL.test(sanitized)) {
    return { isValid: false, error: 'Email inválido' }
  }

  if (sanitized.length > 254) {
    return { isValid: false, error: 'Email muito longo' }
  }

  return { isValid: true, value: sanitized }
}

/**
 * Valida e sanitiza CPF
 */
export function validateCPF(cpf) {
  if (!cpf || typeof cpf !== 'string') {
    return { isValid: false, error: 'CPF é obrigatório' }
  }

  const sanitized = sanitizeString(cpf.replace(/\D/g, ''))
  
  if (sanitized.length !== 11) {
    return { isValid: false, error: 'CPF deve ter 11 dígitos' }
  }

  // Verifica se não são todos os dígitos iguais
  if (/^(\d)\1{10}$/.test(sanitized)) {
    return { isValid: false, error: 'CPF inválido' }
  }

  // Validação do algoritmo do CPF
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(sanitized.charAt(i)) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(sanitized.charAt(9))) {
    return { isValid: false, error: 'CPF inválido' }
  }

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(sanitized.charAt(i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(sanitized.charAt(10))) {
    return { isValid: false, error: 'CPF inválido' }
  }

  return { isValid: true, value: sanitized }
}

/**
 * Valida senha forte (para registro)
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Senha é obrigatória' }
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Senha deve ter pelo menos 8 caracteres' }
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Senha muito longa' }
  }

  if (!VALIDATION_PATTERNS.PASSWORD.test(password)) {
    return { 
      isValid: false, 
      error: 'Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial' 
    }
  }

  return { isValid: true, value: password }
}

/**
 * Valida senha para login (mais flexível)
 */
export function validateLoginPassword(password) {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Senha é obrigatória' }
  }

  if (password.length < 1) {
    return { isValid: false, error: 'Senha é obrigatória' }
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Senha muito longa' }
  }

  return { isValid: true, value: password }
}

/**
 * Valida nome
 */
export function validateName(name) {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Nome é obrigatório' }
  }

  const sanitized = sanitizeString(name.trim())
  
  if (sanitized.length < 2) {
    return { isValid: false, error: 'Nome deve ter pelo menos 2 caracteres' }
  }

  if (sanitized.length > 100) {
    return { isValid: false, error: 'Nome muito longo' }
  }

  if (!VALIDATION_PATTERNS.NAME.test(sanitized)) {
    return { isValid: false, error: 'Nome contém caracteres inválidos' }
  }

  return { isValid: true, value: sanitized }
}

/**
 * Valida telefone
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Telefone é obrigatório' }
  }

  const sanitized = sanitizeString(phone.trim())
  
  if (!VALIDATION_PATTERNS.PHONE.test(sanitized)) {
    return { isValid: false, error: 'Telefone inválido' }
  }

  return { isValid: true, value: sanitized }
}

/**
 * Valida data
 */
export function validateDate(date) {
  if (!date || typeof date !== 'string') {
    return { isValid: false, error: 'Data é obrigatória' }
  }

  const sanitized = sanitizeString(date.trim())
  
  if (!VALIDATION_PATTERNS.DATE.test(sanitized)) {
    return { isValid: false, error: 'Data deve estar no formato YYYY-MM-DD' }
  }

  const dateObj = new Date(sanitized)
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: 'Data inválida' }
  }

  // Verifica se a data não é muito no futuro (100 anos)
  const maxDate = new Date()
  maxDate.setFullYear(maxDate.getFullYear() + 100)
  
  if (dateObj > maxDate) {
    return { isValid: false, error: 'Data muito distante no futuro' }
  }

  // Verifica se a data não é muito no passado (150 anos)
  const minDate = new Date()
  minDate.setFullYear(minDate.getFullYear() - 150)
  
  if (dateObj < minDate) {
    return { isValid: false, error: 'Data muito distante no passado' }
  }

  return { isValid: true, value: sanitized }
}

/**
 * Valida texto livre (comentários, observações)
 */
export function validateText(text, maxLength = 1000) {
  if (!text || typeof text !== 'string') {
    return { isValid: false, error: 'Texto é obrigatório' }
  }

  const sanitized = sanitizeString(text.trim())
  
  if (sanitized.length === 0) {
    return { isValid: false, error: 'Texto não pode estar vazio' }
  }

  if (sanitized.length > maxLength) {
    return { isValid: false, error: `Texto deve ter no máximo ${maxLength} caracteres` }
  }

  return { isValid: true, value: sanitized }
}

/**
 * Validador genérico para objetos
 */
export function validateObject(obj, schema) {
  const errors = {}
  const sanitized = {}

  for (const [field, validator] of Object.entries(schema)) {
    const value = obj[field]
    const result = validator(value)
    
    if (!result.isValid) {
      errors[field] = result.error
    } else {
      sanitized[field] = result.value
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized
  }
}

/**
 * Esquemas de validação pré-definidos
 */
export const VALIDATION_SCHEMAS = {
  USER_REGISTRATION: {
    email: validateEmail,
    password: validatePassword,
    first_name: validateName,
    last_name: validateName,
    cpf: validateCPF,
    phone: validatePhone
  },
  
  USER_PROFILE: {
    first_name: validateName,
    last_name: validateName,
    phone: validatePhone,
    data_nascimento: validateDate
  },
  
  MEDICAL_RECORD: {
    observacoes: (text) => validateText(text, 5000),
    diagnostico: (text) => validateText(text, 1000),
    prescricao: (text) => validateText(text, 2000)
  }
}

/**
 * Hook React para validação
 */
export function useValidation(schema) {
  const [errors, setErrors] = useState({})

  const validate = useCallback((data) => {
    const result = validateObject(data, schema)
    setErrors(result.errors)
    return result
  }, [schema])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const clearFieldError = useCallback((field) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])

  return {
    errors,
    validate,
    clearErrors,
    clearFieldError,
    hasErrors: Object.keys(errors).length > 0
  }
}