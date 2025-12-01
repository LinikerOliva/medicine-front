import axios from "axios";
import { secureStorage } from "../utils/secureStorage";
// (imports reduzidos)

// FALLBACK DE SEGURANÇA: Se não ler do .env, usa direto a URL do Render (com /api)
const API_URL = "https://tcc-back-ktwy.onrender.com";
console.log("--- FORÇANDO API PRODUÇÃO ---");
console.log("URL:", API_URL);

// --- CRIAÇÃO DO AXIOS ---
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // Aumentei para 30s pois o Render "dorme" e demora pra acordar
});

// --- INTERCEPTOR DE REQUISIÇÃO (TOKEN) ---
api.interceptors.request.use((config) => {
  const token = secureStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

// --- INTERCEPTOR DE RESPOSTA (ERROS E REFRESH) ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Erro na API:", error);
    return Promise.reject(error);
  }
);

export default api;
