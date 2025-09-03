import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.jsx"
import { ThemeProvider } from "./components/theme-provider"
import { Toaster } from "./components/ui/toaster"

// Suprime no DEV o alerta gerado por extensão: 
// "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received"
if (typeof window !== "undefined" && import.meta.env.DEV) {
  const suppressExtensionWarning = (ev) => {
    const reason = ev?.reason
    const msg = typeof reason === "string" ? reason : reason?.message
    if (
      msg &&
      msg.includes(
        "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received"
      )
    ) {
      ev.preventDefault()
      // Opcional: habilite para ver que foi suprimido
      // console.debug("[dev] Aviso de extensão suprimido:", msg)
    }
  }
  window.addEventListener("unhandledrejection", suppressExtensionWarning)
}

createRoot(document.getElementById("root")).render(
  <ThemeProvider defaultTheme="system" storageKey="medicinefront-theme">
    <App />
    <Toaster />
  </ThemeProvider>
)
