import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Contexts
import { AuthProvider } from "./contexts/auth-context";
import { UserProvider } from "./contexts/user-context";

// Layouts
import PacienteLayout from "./layouts/paciente-layout";
import MedicoLayout from "./layouts/medico-layout";
import ClinicaLayout from "./layouts/clinica-layout";
import AdminLayout from "./layouts/admin-layout";

// Pages - Auth
import LoginForm from "./components/auth/login-form";
import RegisterForm from "./components/auth/register-form";
import ForgotPasswordForm from "./components/auth/forgot-password-form";
import RequireSecretaria from "./components/auth/require-secretaria"
import SecretariaLayout from "./layouts/secretaria-layout"
import ResetPasswordForm from "./components/auth/reset-password-form";
import SecretariaSolicitacoes from "@/pages/secretaria/solicitacoes"
import SecretariaSolicitacaoDetalhes from "@/pages/secretaria/solicitacoes-detalhes"

// Paciente
import PerfilPaciente from "./pages/paciente/perfil/perfil";
import ProntuarioPaciente from "./pages/paciente/prontuario/prontuario";
import ConsultasPaciente from "./pages/paciente/consultas/consultas";
import ExamesPaciente from "./pages/paciente/exames/exames";
import HistoricoMedico from "./pages/paciente/historico-medico/historico-medico";
import MedicosPaciente from "./pages/paciente/medicos/medicos";
import ReceitasPaciente from "./pages/paciente/receitas/receitas";

// Médico
import DashboardMedico from "./pages/medico/dashboard/dashboard";
import MeusPacientes from "./pages/medico/meus-pacientes/meus-pacientes";
import ConsultasMedico from "./pages/medico/minhas-consultas/minhas-consultas";
import PerfilPacienteMedico from "./pages/medico/paciente/[id]/perfil/perfil";
import ProntuarioPacienteMedico from "./pages/medico/paciente/[id]/prontuario/prontuario";
import ExamesPacienteMedico from "./pages/medico/paciente/[id]/exames/exames";
import IniciarConsulta from "./pages/medico/paciente/[id]/iniciar-consulta/iniciar-consulta";
import MedicoConsultasHoje from "./pages/medico/consultas/hoje";
import PreviewReceitaMedico from "./pages/medico/paciente/[id]/receita/preview";
import ConfirmacaoEnvioReceita from "@/pages/medico/paciente/[id]/receita/confirmacao";
import ResumoConsultaMedico from "./pages/medico/paciente/[id]/consulta/resumo";

// Clínica
import DashboardClinica from "./pages/clinica/dashboard/dashboard";
import CalendarioClinica from "./pages/clinica/calendario/calendario";
import DisponibilidadeClinica from "./pages/clinica/disponibilidade/disponibilidade";
import ExamesClinica from "./pages/clinica/exames/exames";
import PacientesClinica from "./pages/clinica/pacientes/pacientes";
import MedicosClinica from "./pages/clinica/medicos/medicos";
import RelatoriosClinica from "./pages/clinica/relatorios/relatorios";
import ConfiguracoesClinica from "./pages/clinica/configuracoes/configuracoes";

// Admin
import DashboardAdmin from "./pages/admin/dashboard/dashboard";
import SolicitarMedicos from "./pages/admin/solicitacoes/solicitacoes";
import DetalhesSolicitacao from "./pages/admin/solicitacoes/[id]/detalhes";
import RelatoriosAdmin from "./pages/admin/relatorios/relatorios";
import AuditoriaAdmin from "./pages/admin/auditoria/auditoria";

// Home
import Home from "./pages/home";
import Configuracao from "./pages/configuracao/configuracao"
import RequireMedico from "./components/auth/require-medico"
import RequireClinica from "./components/auth/require-clinica"
import RequirePaciente from "./components/auth/require-paciente"
import RequireAdmin from "./components/auth/require-admin"
import AgendarConsultaPaciente from "./pages/paciente/consultas/nova"
import UsuariosAdmin from "./pages/admin/usuarios/usuarios"
import ClinicasAdmin from "./pages/admin/clinicas/clinicas"
import ConfiguracoesAdmin from "./pages/admin/configuracoes/configuracoes"

// Secretária
import DashboardSecretaria from "./pages/secretaria/dashboard"
import ConsultasSecretaria from "./pages/secretaria/consultas"
import PacientesSecretaria from "./pages/secretaria/pacientes"
import MedicosSecretaria from "./pages/secretaria/medicos"
import AgendaSecretaria from "./pages/secretaria/agenda"
import ReceberReceita from "./pages/receber/receita"
function App() {
  return (
    <AuthProvider>
      <UserProvider>
        {/* Ative as future flags do React Router v7 */}
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Rotas Públicas */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/registrar" element={<RegisterForm />} />
            <Route path="/esqueci-senha" element={<ForgotPasswordForm />} />
            <Route path="/redefinir-senha/:uid/:token" element={<ResetPasswordForm />} />
            <Route path="/receber/receita" element={<ReceberReceita />} />

            {/* Paciente */}
            <Route
              path="/paciente"
              element={
                <RequirePaciente>
                  <PacienteLayout />
                </RequirePaciente>
              }
            >
              {/* Ajuste: enviar para perfil (não existe 'dashboard') */}
              <Route index element={<Navigate to="perfil" replace />} />
              <Route path="perfil" element={<PerfilPaciente />} />
              <Route path="prontuario" element={<ProntuarioPaciente />} />
              <Route path="consultas" element={<ConsultasPaciente />} />
              <Route path="consultas/nova" element={<AgendarConsultaPaciente />} />
              <Route path="exames" element={<ExamesPaciente />} />
              <Route path="historico-medico" element={<HistoricoMedico />} />
              <Route path="medicos" element={<MedicosPaciente />} />
              <Route path="receitas" element={<ReceitasPaciente />} />
              <Route path="configuracoes" element={<Configuracao />} />
            </Route>

            {/* Médico (permite admin) */}
            <Route
              path="/medico"
              element={
                <RequireMedico>
                  <MedicoLayout />
                </RequireMedico>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardMedico />} />
              <Route path="meus-pacientes" element={<MeusPacientes />} />
              <Route path="minhas-consultas" element={<ConsultasMedico />} />
              <Route path="consultas/hoje" element={<MedicoConsultasHoje />} />
              <Route path="paciente/:id/perfil" element={<PerfilPacienteMedico />} />
              <Route path="paciente/:id/prontuario" element={<ProntuarioPacienteMedico />} />
              <Route path="paciente/:id/exames" element={<ExamesPacienteMedico />} />
              <Route path="paciente/:id/iniciar-consulta" element={<IniciarConsulta />} />
              {/* Nova rota de resumo da consulta */}
              <Route path="paciente/:id/consulta/resumo" element={<ResumoConsultaMedico />} />
              <Route path="paciente/:id/receita/preview" element={<PreviewReceitaMedico />} />
              <Route path="paciente/:id/receita/confirmacao" element={<ConfirmacaoEnvioReceita />} />
              <Route path="configuracoes" element={<Configuracao />} />
            </Route>

            {/* Clínica (permite admin) */}
            <Route
              path="/clinica"
              element={
                <RequireClinica>
                  <ClinicaLayout />
                </RequireClinica>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardClinica />} />
              <Route path="calendario" element={<CalendarioClinica />} />
              <Route path="disponibilidade" element={<DisponibilidadeClinica />} />
              {/* NOVAS ROTAS */}
              <Route path="exames" element={<ExamesClinica />} />
              <Route path="pacientes" element={<PacientesClinica />} />
              <Route path="medicos" element={<MedicosClinica />} />
              <Route path="relatorios" element={<RelatoriosClinica />} />
              <Route path="configuracoes" element={<ConfiguracoesClinica />} />
            </Route>

            {/* Admin (somente admin) */}
            {/* Dentro do bloco de rotas do Admin */}
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardAdmin />} />
              <Route path="solicitacoes" element={<SolicitarMedicos />} />
              <Route path="solicitacoes/:id" element={<DetalhesSolicitacao />} />
              <Route path="relatorios" element={<RelatoriosAdmin />} />
              <Route path="auditoria" element={<AuditoriaAdmin />} />
            
              {/* Novas rotas */}
              <Route path="usuarios" element={<UsuariosAdmin />} />
              <Route path="clinicas" element={<ClinicasAdmin />} />
              <Route path="configuracoes" element={<ConfiguracoesAdmin />} />
            </Route>

            {/* Secretária (permite admin) */}
            <Route
              path="/secretaria"
              element={
                <RequireSecretaria>
                  <SecretariaLayout />
                </RequireSecretaria>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardSecretaria />} />
              <Route path="consultas" element={<ConsultasSecretaria />} />
              <Route path="agenda" element={<AgendaSecretaria />} />
              <Route path="pacientes" element={<PacientesSecretaria />} />
              <Route path="medicos" element={<MedicosSecretaria />} />
              <Route path="solicitacoes" element={<SecretariaSolicitacoes />} />
              <Route path="solicitacoes/:id" element={<SecretariaSolicitacaoDetalhes />} />
              <Route path="configuracoes" element={<Configuracao />} />
            </Route>

            {/* Página não encontrada */}
            <Route path="*" element={<div>Página não encontrada</div>} />
          </Routes>
        </Router>
      </UserProvider>
    </AuthProvider>
  );
}

export default App;
