"use client"

import { Link } from "react-router-dom"
import { Button } from "../components/ui/button"
import { UserRoleSelector } from "../components/user-role-selector"
import { ThemeToggle } from "../components/theme-toggle"
import { useUser } from "../contexts/user-context"

export default function Home() {
  const { isAuthenticated } = useUser()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link to="/" className="mr-6 flex items-center space-x-2">
              <span className="font-bold">Portal Médico</span>
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
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-8 text-center">
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Bem-vindo ao Portal Médico
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Conectando médicos e pacientes para uma experiência de saúde integrada.
                </p>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-lg dark:text-gray-400">
                  Nossa plataforma oferece uma solução completa para gerenciamento de consultas, prontuários e histórico médico,
                  facilitando a comunicação entre profissionais de saúde e pacientes.
                </p>
              </div>
              
              {!isAuthenticated ? (
                <div className="w-full max-w-md mx-auto mt-8">
                  <div className="flex flex-col space-y-4">
                    <Link to="/login" className="w-full">
                      <Button className="w-full h-12 rounded-xl bg-app-gradient text-white font-semibold shadow-app hover:opacity-90">
                        Entrar
                      </Button>
                    </Link>
                    <Link to="/registrar" className="w-full">
                      <Button
                        variant="outline"
                        className="w-full h-12 rounded-xl border-slate-300 bg-white/90 text-slate-700 shadow-sm hover:bg-white hover:shadow-md"
                      >
                        Criar Conta
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-x-4">
                  <Link to="/medico/dashboard">
                    <Button>Acessar como Médico</Button>
                  </Link>
                  <Link to="/paciente/perfil">
                    <Button variant="outline">Acessar como Paciente</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
