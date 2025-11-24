import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.jsx"
import { ThemeProvider } from "./components/theme-provider"
import { Toaster } from "./components/ui/toaster"

createRoot(document.getElementById("root")).render(
  <ThemeProvider defaultTheme="system" storageKey="medicinefront-theme">
    <App />
    <Toaster />
  </ThemeProvider>
)
