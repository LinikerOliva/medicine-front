import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.jsx"
import { ThemeProvider } from "./components/theme-provider"
import { Toaster } from "./components/ui/toaster"
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "V.25"
try { if (typeof window !== "undefined") window.__APP_VERSION__ = APP_VERSION } catch {}
try { console.info(`[MedicineFront] Versão do commit: ${APP_VERSION}`) } catch {}

createRoot(document.getElementById("root")).render(
  <ThemeProvider defaultTheme="system" storageKey="medicinefront-theme">
    <App />
    <Toaster />
  </ThemeProvider>
)
