"use client"

import { Link } from "react-router-dom"
import { Button } from "../components/ui/button"
import { UserRoleSelector } from "../components/user-role-selector"
import { ThemeToggle } from "../components/theme-toggle"
import { useUser } from "../contexts/user-context"
import { 
  Heart, 
  Stethoscope, 
  Calendar, 
  Shield, 
  Users, 
  Activity,
  Sparkles,
  ArrowRight
} from "lucide-react"

export default function Home() {
  const { isAuthenticated } = useUser()

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <header className="sticky top-0 z-50 w-full border-b border-blue-100/50 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 shadow-sm">
        <div className="container flex h-16 items-center">
          <div className="mr-4 flex">
            <Link to="/" className="mr-6 flex items-center space-x-3 group">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-medical-primary to-blue-600 text-white shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300 group-hover:scale-105">
                <Heart className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-medical-primary to-blue-600 bg-clip-text text-transparent">
                Portal Médico
              </span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <nav className="flex items-center space-x-2">
              <ThemeToggle />
              {isAuthenticated && <UserRoleSelector />}
            </nav>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-16 md:py-24 lg:py-32 relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-teal-400/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-medical-primary/20 to-purple-400/20 rounded-full blur-3xl"></div>
          </div>
          
          <div className="container px-4 md:px-6 relative">
            <div className="flex flex-col items-center justify-center space-y-12 text-center">
              <div className="space-y-6 max-w-4xl">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-teal-100 text-medical-primary font-medium text-sm border border-blue-200/50">
                  <Sparkles className="w-4 h-4" />
                  Plataforma Médica Integrada
                </div>
                
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                  <span className="bg-gradient-to-r from-medical-primary via-blue-600 to-teal-600 bg-clip-text text-transparent">
                    Bem-vindo ao
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-teal-600 via-medical-primary to-blue-600 bg-clip-text text-transparent">
                    Portal Médico
                  </span>
                </h1>
                
                <p className="mx-auto max-w-[800px] text-xl text-slate-600 leading-relaxed">
                  Conectando médicos e pacientes para uma experiência de saúde integrada e moderna.
                </p>
                
                <p className="mx-auto max-w-[700px] text-lg text-slate-500 leading-relaxed">
                  Nossa plataforma oferece uma solução completa para gerenciamento de consultas, prontuários e histórico médico,
                  facilitando a comunicação entre profissionais de saúde e pacientes.
                </p>
              </div>

              {/* Features Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-16">
                <div className="group p-6 rounded-2xl bg-white/70 backdrop-blur-sm border border-blue-100/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Consultas Online</h3>
                  <p className="text-slate-600 text-sm">Agende e realize consultas médicas de forma digital e segura.</p>
                </div>

                <div className="group p-6 rounded-2xl bg-white/70 backdrop-blur-sm border border-teal-100/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-white mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Activity className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Prontuário Digital</h3>
                  <p className="text-slate-600 text-sm">Acesse seu histórico médico completo em qualquer lugar.</p>
                </div>

                <div className="group p-6 rounded-2xl bg-white/70 backdrop-blur-sm border border-purple-100/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Segurança Total</h3>
                  <p className="text-slate-600 text-sm">Seus dados médicos protegidos com criptografia avançada.</p>
                </div>
              </div>

               {/* Action Buttons */}
               <div className="flex flex-col sm:flex-row gap-4 mt-12">
                 {!isAuthenticated ? (
                   <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto">
                     <Link to="/login" className="flex-1">
                       <Button className="w-full h-14 rounded-xl bg-gradient-to-r from-medical-primary to-blue-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group">
                         <span className="flex items-center gap-2">
                           Entrar
                           <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                         </span>
                       </Button>
                     </Link>
                     <Link to="/registrar" className="flex-1">
                       <Button
                         variant="outline"
                         className="w-full h-14 rounded-xl border-2 border-medical-primary/20 bg-white/90 text-medical-primary font-semibold shadow-lg hover:bg-medical-primary/5 hover:border-medical-primary/40 hover:shadow-xl hover:scale-105 transition-all duration-300"
                       >
                         Criar Conta
                       </Button>
                     </Link>
                   </div>
                 ) : (
                   <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg mx-auto">
                     <Link to="/medico/dashboard" className="flex-1">
                       <Button className="w-full h-14 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group">
                         <span className="flex items-center gap-2">
                           <Stethoscope className="w-5 h-5" />
                           Acessar como Médico
                         </span>
                       </Button>
                     </Link>
                     <Link to="/paciente/perfil" className="flex-1">
                       <Button 
                         variant="outline"
                         className="w-full h-14 rounded-xl border-2 border-blue-500/20 bg-white/90 text-blue-600 font-semibold shadow-lg hover:bg-blue-500/5 hover:border-blue-500/40 hover:shadow-xl hover:scale-105 transition-all duration-300 group"
                       >
                         <span className="flex items-center gap-2">
                           <Users className="w-5 h-5" />
                           Acessar como Paciente
                         </span>
                       </Button>
                     </Link>
                   </div>
                 )}
               </div>
             </div>
           </div>
         </section>
       </main>
     </div>
   )
 }
