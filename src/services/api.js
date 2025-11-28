import axios from "axios";
// Certifique-se que estes arquivos existem no seu projeto, senão vai dar erro!
import { secureStorage } from "../utils/secureStorage";
import { mockService } from "./mockService";
import digitalSignatureServiceInstance from './digitalSignatureService';

// --- CONFIGURAÇÃO INTELIGENTE DE URL ---
// 1. Pega a URL do Render definida no .env ou Vercel
const ENV_API_URL = import.meta.env.VITE_API_URL || "https://tcc-back-ktwy.onrender.com";

// 2. Define se usa Proxy (Local) ou Direto (Vercel)
// Se não estiver definido, assume FALSE para garantir que funcione em produção
const USE_PROXY = import.meta.env.VITE_USE_PROXY === 'true';

// 3. Define a baseURL final
// Se for proxy, deixamos vazio (o navegador completa). Se for produção, usa a URL completa.
const BASE_URL = USE_PROXY ? '' : ENV_API_URL;

console.info(`[API] Conectando em: ${USE_PROXY ? 'PROXY LOCAL' : ENV_API_URL}`);

// --- CRIAÇÃO DO AXIOS ---
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // Aumentei para 30s pois o Render "dorme" e demora pra acordar
});

// --- INTERCEPTOR DE REQUISIÇÃO (TOKEN) ---
api.interceptors.request.use((config) => {
  // Ajuste de caminhos (garante que /api/ esteja presente se necessário)
  const path = config.url || '';
  if (!path.startsWith('http') && !path.startsWith('/api/') && USE_PROXY) {
      config.url = `/api${path.startsWith('/') ? path : '/' + path}`;
  }

  // Ignorar token em rotas públicas
  const publicEndpoints = [
      '/auth/login/', 
      '/auth/register/', 
      '/auth/google/',
      '/auth/forgot-password/'
  ];
  if (publicEndpoints.some(endpoint => config.url?.includes(endpoint))) {
      return config;
  }

  // Injeção do Token
  const token = secureStorage.getItem("access_token");
  if (token) {
      // Verifica se o esquema é Bearer ou Token (padrão Django às vezes muda)
      const scheme = secureStorage.getItem("auth_scheme") || "Token"; 
      config.headers.Authorization = `${scheme} ${token}`;
  }

  // Limpeza para envio de Arquivos (FormData)
  if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
  }

  return config;
}, (error) => Promise.reject(error));

// --- INTERCEPTOR DE RESPOSTA (ERROS E REFRESH) ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 1. Tratamento de Mocks (para desenvolvimento)
    if (error.response?.status === 404 && import.meta.env.DEV) {
        if (mockService.shouldMock(originalRequest.url)) {
            console.warn('[MOCK] Retornando dados falsos para 404:', originalRequest.url);
            return mockService.getMockResponse(originalRequest.url, originalRequest.method);
        }
    }

    // 2. Lógica de Refresh Token (Erro 401)
    if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
            const refreshToken = secureStorage.getItem("refresh_token");
            if (refreshToken) {
                // Tenta renovar o token
                const response = await axios.post(`${ENV_API_URL}/api/auth/token/refresh/`, {
                    refresh: refreshToken
                });

                const { access } = response.data;
                secureStorage.setItem("access_token", access);
                
                // Refaz a requisição original com o novo token
                const scheme = secureStorage.getItem("auth_scheme") || "Token";
                originalRequest.headers.Authorization = `${scheme} ${access}`;
                // Força a baseURL correta na retentativa
                originalRequest.baseURL = BASE_URL; 
                
                return api(originalRequest);
            }
        } catch (refreshError) {
            // Se falhar o refresh, desloga o usuário
            console.error("Sessão expirada. Faça login novamente.");
            secureStorage.removeItem("access_token");
            secureStorage.removeItem("refresh_token");
            window.location.href = "/login";
        }
    }

    return Promise.reject(error);
  }
);

export default api;

// Exportação auxiliar para assinatura digital (mantendo sua lógica)
export const signPrescription = (prescriptionData) => {
  return digitalSignatureServiceInstance.signPrescription(prescriptionData);
};