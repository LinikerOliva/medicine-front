import axios from "axios";
import { secureStorage } from "../utils/secureStorage";
const API_URL = (import.meta.env.VITE_API_URL || "https://tcc-back-ktwy.onrender.com").replace(/\/$/, "");

// --- CRIAÇÃO DO AXIOS ---
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
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
  // Prefixa automaticamente "/api" em chamadas relativas que não são absolutas nem já começam com "/api"
  try {
    const url = String(config.url || "");
    const isAbsolute = /^https?:\/\//i.test(url);
    const startsWithSlash = url.startsWith("/");
    const alreadyHasApi = url.startsWith("/api/") || url === "/api";
    // Só quando não for absoluto e não tiver "/api" explícito
    if (!isAbsolute && !alreadyHasApi) {
      const normalized = startsWithSlash ? url : `/${url}`;
      config.url = `/api${normalized}`;
    }
  } catch {}
  return config;
});

// --- INTERCEPTOR DE RESPOSTA (ERROS E REFRESH) ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
