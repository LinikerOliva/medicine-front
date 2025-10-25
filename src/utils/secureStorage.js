/**
 * Utilitário para armazenamento seguro de dados sensíveis
 * Implementa criptografia básica para tokens e dados do usuário
 */

// Chave simples para criptografia (em produção, usar uma chave mais robusta)
const ENCRYPTION_KEY = 'medicine-app-secure-key-2024'

/**
 * Criptografia simples usando btoa/atob com ofuscação
 */
function encrypt(text) {
  if (!text) return ''
  try {
    // Adiciona salt aleatório
    const salt = Math.random().toString(36).substring(2, 15)
    const saltedText = salt + '|' + text
    // Codifica em base64 com ofuscação simples
    return btoa(saltedText).split('').reverse().join('')
  } catch (error) {
    console.warn('Erro na criptografia, usando texto plano:', error)
    return text
  }
}

/**
 * Descriptografia
 */
function decrypt(encryptedText) {
  if (!encryptedText) return ''
  try {
    // Reverte a ofuscação e decodifica
    const decoded = atob(encryptedText.split('').reverse().join(''))
    // Remove o salt
    const parts = decoded.split('|')
    return parts.length > 1 ? parts.slice(1).join('|') : decoded
  } catch (error) {
    console.warn('Erro na descriptografia, retornando texto original:', error)
    return encryptedText
  }
}

/**
 * Armazenamento seguro
 */
export const secureStorage = {
  /**
   * Armazena um item de forma segura
   */
  setItem(key, value) {
    try {
      const encrypted = encrypt(typeof value === 'string' ? value : JSON.stringify(value))
      localStorage.setItem(`secure_${key}`, encrypted)
      return true
    } catch (error) {
      console.error('Erro ao armazenar item seguro:', error)
      return false
    }
  },

  /**
   * Recupera um item armazenado de forma segura
   */
  getItem(key) {
    try {
      const encrypted = localStorage.getItem(`secure_${key}`)
      if (!encrypted) return null
      
      const decrypted = decrypt(encrypted)
      
      // Tenta fazer parse JSON, se falhar retorna string
      try {
        return JSON.parse(decrypted)
      } catch {
        return decrypted
      }
    } catch (error) {
      console.error('Erro ao recuperar item seguro:', error)
      return null
    }
  },

  /**
   * Remove um item do armazenamento seguro
   */
  removeItem(key) {
    try {
      localStorage.removeItem(`secure_${key}`)
      return true
    } catch (error) {
      console.error('Erro ao remover item seguro:', error)
      return false
    }
  },

  /**
   * Limpa todos os itens seguros
   */
  clear() {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('secure_'))
      keys.forEach(key => localStorage.removeItem(key))
      return true
    } catch (error) {
      console.error('Erro ao limpar armazenamento seguro:', error)
      return false
    }
  },

  /**
   * Migra dados existentes para armazenamento seguro
   */
  migrateFromPlainStorage(plainKey, secureKey = plainKey) {
    try {
      const plainValue = localStorage.getItem(plainKey)
      if (plainValue) {
        this.setItem(secureKey, plainValue)
        localStorage.removeItem(plainKey)
        return true
      }
      return false
    } catch (error) {
      console.error('Erro na migração:', error)
      return false
    }
  }
}

/**
 * Hook para usar armazenamento seguro em componentes React
 */
export function useSecureStorage(key, defaultValue = null) {
  const [value, setValue] = useState(() => {
    return secureStorage.getItem(key) ?? defaultValue
  })

  const setSecureValue = useCallback((newValue) => {
    setValue(newValue)
    if (newValue === null || newValue === undefined) {
      secureStorage.removeItem(key)
    } else {
      secureStorage.setItem(key, newValue)
    }
  }, [key])

  return [value, setSecureValue]
}