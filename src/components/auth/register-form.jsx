import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import { useToast } from "../../hooks/use-toast";

export default function RegisterForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState("paciente");
  // ADICIONE estes dois estados para controlar a visualização das senhas
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmSenha, setShowConfirmSenha] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    confirmSenha: "",
    cpf: "", // Adicionar campo CPF
    // Campos extras para clínica
    nomeClinica: "",
    cnpj: "",
  });

  // Função utilitária para formatar CPF no padrão XXX.XXX.XXX-XX
  const formatCPF = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    const p1 = digits.slice(0, 3);
    const p2 = digits.slice(3, 6);
    const p3 = digits.slice(6, 9);
    const p4 = digits.slice(9, 11);
    if (digits.length > 9) return `${p1}.${p2}.${p3}-${p4}`;
    if (digits.length > 6) return `${p1}.${p2}.${p3}`;
    if (digits.length > 3) return `${p1}.${p2}`;
    return p1;
  };
  // NOVO: formatador de CNPJ 00.000.000/0000-00 com limitação a 14 dígitos
  const formatCNPJ = (value) => {
    const d = String(value || "").replace(/\D/g, "").slice(0, 14);
    const p1 = d.slice(0, 2);
    const p2 = d.slice(2, 5);
    const p3 = d.slice(5, 8);
    const p4 = d.slice(8, 12);
    const p5 = d.slice(12, 14);
    if (d.length > 12) return `${p1}.${p2}.${p3}/${p4}-${p5}`;
    if (d.length > 8) return `${p1}.${p2}.${p3}/${p4}`;
    if (d.length > 5) return `${p1}.${p2}.${p3}`;
    if (d.length > 2) return `${p1}.${p2}`;
    return p1;
  };
  // NOVO: limitador de CRM (somente números, até 7 dígitos)
  const formatCRM = (value) => String(value || "").replace(/\D/g, "").slice(0, 7);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Formatar CPF automaticamente para o padrão exigido pelo backend
    if (name === "cpf") {
      setFormData({ ...formData, cpf: formatCPF(value) });
      return;
    }
    // NOVO: Formatar CNPJ e limitar a 14 dígitos
    if (name === "cnpj") {
      setFormData({ ...formData, cnpj: formatCNPJ(value) });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  // Capitaliza cada palavra: "joao da silva" -> "Joao Da Silva"
  const capitalizeWords = (str) => {
    return String(str || "")
      .trim()
      .replace(/\s+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
      .join(" ");
  };

  // NOVO: estado e refs para dados do médico
  const [medicoForm, setMedicoForm] = useState({
    crm: "",
    especialidade: "",
    instituicaoFormacao: "",
    anoFormacao: "",
    residencia: "",
    instituicaoResidencia: "",
    anoResidencia: "",
    experiencia: "",
    motivacao: "",
    documentos: {
      diplomaMedicina: null,
      certificadoResidencia: null,
      comprovanteExperiencia: null,
    },
  });
  const diplomaInputRef = useRef(null);
  const residenciaInputRef = useRef(null);
  const experienciaInputRef = useRef(null);

  const handleMedicoChange = (e) => {
    const { name, value } = e.target;
    if (name === "crm") {
      setMedicoForm((prev) => ({ ...prev, crm: formatCRM(value) }));
    } else {
      setMedicoForm((prev) => ({ ...prev, [name]: value }));
    }
  };
  const handleMedicoDocChange = (key, file) => {
    setMedicoForm((prev) => ({
      ...prev,
      documentos: { ...prev.documentos, [key]: file },
    }));
  };
  const removeMedicoDoc = (key, ref) => {
    setMedicoForm((prev) => ({
      ...prev,
      documentos: { ...prev.documentos, [key]: null },
    }));
    if (ref?.current) ref.current.value = "";
  };

  // Helper: formata bytes (ex.: 1.2 MB)
  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Byte";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Componente de upload bonito com dropzone
  const DocUpload = ({
    label,
    required = false,
    icon = "📄",
    accept = ".pdf,image/*",
    file,
    onFile,
    onRemove,
    inputRef,
  }) => {
    const [dragOver, setDragOver] = useState(false);

    const handleDrop = (e) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) onFile(f);
    };

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <label className="text-sm font-medium text-slate-700">
            {label}{" "}
            {required ? (
              <span className="text-rose-600">*</span>
            ) : (
              <span className="text-slate-400">(opcional)</span>
            )}
          </label>
        </div>

        {/* Input oculto controlado por botão */}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] || null)}
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`rounded-lg border-2 p-3 flex items-center justify-between gap-3 transition
            ${dragOver ? "border-sky-400 bg-sky-50" : "border-dashed border-slate-300 bg-white"}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-md bg-slate-100 flex items-center justify-center text-lg">
              {icon}
            </div>

            {file ? (
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500">
                  {(file.type || "Arquivo")} • {formatBytes(file.size)}
                </p>
              </div>
            ) : (
              <div className="text-sm text-slate-600">
                Arraste e solte aqui ou{" "}
                <button
                  type="button"
                  onClick={() => inputRef?.current?.click()}
                  className="underline text-sky-700 hover:text-sky-800"
                >
                  procurar
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!file && (
              <button
                type="button"
                onClick={() => inputRef?.current?.click()}
                className="px-3 py-2 rounded-md bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Escolher arquivo
              </button>
            )}
            {file && (
              <button
                type="button"
                onClick={onRemove}
                className="px-3 py-2 rounded-md bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100"
              >
                Remover
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };
  const isValidEmail =
    formData.email.length === 0 ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);

  const passwordsMatch =
    formData.confirmSenha.length === 0 ||
    (formData.senha.length > 0 && formData.senha === formData.confirmSenha);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações
    if (!formData.nome || !formData.email || !formData.senha || !formData.cpf) {
      toast({
        title: "Erro de validação",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (formData.senha !== formData.confirmSenha) {
      toast({
        title: "Erro de validação",
        description: "As senhas não conferem.",
        variant: "destructive",
      });
      return;
    }

    if (formData.senha.length < 6) {
      toast({
        title: "Erro de validação",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    // NOVO: validações mínimas para médico
    if (tipo === "medico") {
      if (!medicoForm.crm) {
        toast({
          title: "CRM obrigatório",
          description: "Informe o CRM para cadastro como médico.",
          variant: "destructive",
        });
        return;
      }
      if (!medicoForm.documentos.diplomaMedicina) {
        toast({
          title: "Diploma obrigatório",
          description: "Anexe o Diploma de Medicina.",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    try {
      // Normaliza e capitaliza o nome completo
      const nomeNormalizado = String(formData.nome || "").trim().replace(/\s+/g, " ");
      const nomeCapitalizado = capitalizeWords(nomeNormalizado);
      const [firstName, ...resto] = nomeCapitalizado.split(" ");
      const lastName = resto.join(" ");

      const userData = {
        username: formData.nome
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ")
          .replace(/[^a-z0-9@.+_-]/g, ""),
        first_name: firstName || "",
        last_name: lastName || "",
        email: formData.email,
        password: formData.senha,
        password_confirm: formData.confirmSenha,
        // IMPORTANTE: se for médico, não enviamos 'medico' como role no registro para evitar que o backend tente criar Medico direto
        // Enviamos um papel seguro (paciente) e carregamos desired_role para referência futura
        role: tipo === "medico" ? (import.meta.env.VITE_DEFAULT_MEDICO_REGISTER_ROLE || "paciente") : tipo,
        desired_role: tipo,
        cpf: formData.cpf || "",
      };

      if (tipo === "clinica") {
        userData.nome_clinica = formData.nomeClinica;
        userData.cnpj = formData.cnpj;
      }

      const response = await authService.register(userData, { medicoData: tipo === "medico" ? medicoForm : undefined });

      // Resultado da criação de médico (se aplicável)
      if (tipo === "medico") {
        const medApp = response?.medicoApplication;
        if (medApp?.success) {
          toast({
            title: "Solicitação enviada!",
            description: "Seus dados de médico foram enviados para análise.",
          });
        } else if (medApp && medApp.success === false) {
          console.error("[RegisterForm] criarSolicitacaoMedico via authService falhou:", medApp.error);
          toast({
            title: "Solicitação pendente",
            description:
              "Sua conta foi criada, mas não foi possível enviar a solicitação de médico agora. Você poderá concluir depois.",
          });
        }
      }

      toast({
        title: "Registro realizado com sucesso!",
        description: "Sua conta foi criada. Você pode fazer login agora.",
      });

      navigate("/login");
    } catch (error) {
      console.error("Erro no registro:", error);
      console.error("Status do erro:", error.response?.status);
      console.error("Detalhes do erro:", error.response?.data);
      console.error("Headers da resposta:", error.response?.headers);
      
      let errorMessage = "Erro interno do servidor. Tente novamente.";

      // NOVO: heurísticas para respostas HTML (ex.: Django debug) e violações de UNIQUE
      let looksLikeHtmlDjango = false;
      let looksLikeUniqueViolation = false;
      let likelyMedicoUnique = false;
      try {
        const status = error.response?.status;
        const headers = error.response?.headers || {};
        const contentType = (headers["content-type"]) || headers["Content-Type"] || "";
        const rawData = error.response?.data;
        const asString = typeof rawData === "string" ? rawData : "";
        const lower = (asString || "").toLowerCase();

        // Mapeamento de campos únicos comuns
        const setUniqueMessage = (field) => {
          if (field === "crm") errorMessage = "CRM já cadastrado no sistema. Utilize outro número de CRM.";
          else if (field === "email") errorMessage = "E-mail já cadastrado no sistema.";
          else if (field === "cpf") errorMessage = "CPF já cadastrado no sistema.";
          else errorMessage = "Algum campo único já está cadastrado (ex.: CRM, e-mail ou CPF).";
        };

        if (status === 409) {
          // Conflito costuma indicar registro duplicado
          setUniqueMessage("unknown");
          looksLikeUniqueViolation = true;
        }

        looksLikeHtmlDjango = String(contentType).includes("text/html");
        if (looksLikeHtmlDjango || lower.includes("unique constraint") || lower.includes("integrityerror")) {
          if (lower.includes("crm")) {
            setUniqueMessage("crm");
            looksLikeUniqueViolation = true;
            likelyMedicoUnique = true;
          } else if (lower.includes("email")) {
            setUniqueMessage("email");
            looksLikeUniqueViolation = true;
          } else if (lower.includes("cpf")) {
            setUniqueMessage("cpf");
            looksLikeUniqueViolation = true;
          }
        }
      } catch {}
      
      if (error.response?.data) {
        const errorData = error.response.data;
        console.log("Tipo do errorData:", typeof errorData);
        console.log("ErrorData completo:", JSON.stringify(errorData, null, 2));
        
        if (typeof errorData === 'object') {
          const errorMessages = [];
          for (const [field, messages] of Object.entries(errorData)) {
            if (Array.isArray(messages)) {
              errorMessages.push(`${field}: ${messages.join(', ')}`);
            } else {
              errorMessages.push(`${field}: ${messages}`);
            }
          }
          if (errorMessages.length) errorMessage = errorMessages.join('\n');
        }
        if (typeof errorData === 'string') {
          // Se vier string não-HTML, mostre-a; se for HTML, mantemos a mensagem amigável definida acima
          const looksHtml = /<\/?(html|body|head|table|div|span|style|script)[^>]*>/i.test(errorData);
          if (!looksHtml) errorMessage = errorData;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.email) {
          errorMessage = `Email: ${errorData.email[0]}`;
        } else if (errorData.password) {
          errorMessage = `Senha: ${errorData.password[0]}`;
        }
      }

      // NOVO: Recuperação — se for muito provável que o usuário tenha sido criado, redireciona para login
      try {
        const st = error.response?.status;
        const headers = error.response?.headers || {};
        const contentType = headers["content-type"] || headers["Content-Type"] || "";
        const raw = error.response?.data;
        const s = typeof raw === "string" ? raw : "";
        const low = (s || "").toLowerCase();

        const looksUnique = looksLikeUniqueViolation || st === 409 || low.includes("unique constraint") || low.includes("integrityerror");
        const htmlLike = looksLikeHtmlDjango || String(contentType).includes("text/html");
        const mentionsMedicoOrCrm = likelyMedicoUnique || low.includes("crm") || low.includes("medico");

        if (looksUnique && (htmlLike || mentionsMedicoOrCrm)) {
          // Tenta verificar rapidamente se a conta foi criada fazendo um login silencioso
          try {
            await authService.login({ email: formData.email, password: formData.senha });
            // Desloga para manter o fluxo pedido (ir para tela de login)
            await authService.logout();
            toast({
              title: "Conta criada",
              description: "Sua conta foi criada, mas houve um problema com os dados de médico (CRM). Faça login para continuar.",
            });
            navigate("/login");
            return; // evita exibir toast de erro abaixo
          } catch {
            // Se o login não funcionar, seguimos com o erro padrão
          }

          // Caso não consiga verificar via login, ainda assim guia o usuário para login
          toast({
            title: "Conta possivelmente criada",
            description: errorMessage + " — Tente fazer login com seu e-mail e senha.",
          });
          navigate("/login");
          return;
        }
      } catch {}
      
      toast({
        title: "Erro no registro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-soft flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur shadow-app-lg rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 pt-6 pb-4 bg-app-gradient text-white">
          <h1 className="text-xl font-semibold">Criar conta</h1>
          <p className="text-white/90 text-sm">
            {tipo === "paciente" ? "Como paciente" : tipo === "clinica" ? "Como clínica" : "Como médico"}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Toggle de tipo */}
          <div className="bg-slate-100 rounded-lg p-1 grid grid-cols-3 gap-1">
            <button
              type="button"
              className={`py-2 rounded-md text-sm font-semibold transition ${
                tipo === "paciente" ? "bg-white shadow text-slate-900" : "text-slate-600 hover:text-slate-800"
              }`}
              onClick={() => setTipo("paciente")}
            >
              👤 Paciente
            </button>
            <button
              type="button"
              className={`py-2 rounded-md text-sm font-semibold transition ${
                tipo === "clinica" ? "bg-white shadow text-slate-900" : "text-slate-600 hover:text-slate-800"
              }`}
              onClick={() => setTipo("clinica")}
            >
              🏥 Clínica
            </button>
            <button
              type="button"
              className={`py-2 rounded-md text-sm font-semibold transition ${
                tipo === "medico" ? "bg-white shadow text-slate-900" : "text-slate-600 hover:text-slate-800"
              }`}
              onClick={() => setTipo("medico")}
            >
              🩺 Médico
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {tipo !== "clinica" ? (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700">Nome completo</label>
                  <input
                    type="text"
                    name="nome"
                    placeholder="Seu nome"
                    value={formData.nome}
                    onChange={handleChange}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700">Nome da clínica</label>
                  <input
                    type="text"
                    name="nomeClinica"
                    placeholder="Ex.: Clínica Vida"
                    value={formData.nomeClinica}
                    onChange={handleChange}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">CNPJ</label>
                  <input
                    type="text"
                    name="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={formData.cnpj}
                    onChange={handleChange}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                  />
                </div>
              </>
            )}

            {/* E-mail */}
            <div>
              <label className="text-sm font-medium text-slate-700">E-mail</label>
              <input
                type="email"
                name="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                className={`mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:border-sky-500 transition ${
                  isValidEmail ? "border-slate-200 focus:ring-sky-500" : "border-rose-300 focus:ring-rose-500"
                }`}
              />
              {!isValidEmail && (
                <p className="mt-1 text-xs text-rose-600">Informe um e-mail válido.</p>
              )}
            </div>

            {/* CPF — AGORA DENTRO DO FORM */}
            <div>
              <label className="text-sm font-medium text-slate-700">CPF *</label>
              <input
                type="text"
                name="cpf"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Senha</label>
              <div className="relative">
                <input
                  type={showSenha ? "text" : "password"}
                  name="senha"
                  placeholder="Crie uma senha"
                  value={formData.senha}
                  onChange={handleChange}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-12 text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 text-sm px-2 py-1"
                  aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showSenha ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Confirmar senha
              </label>
              <div className="relative">
                <input
                  type={showConfirmSenha ? "text" : "password"}
                  name="confirmSenha"
                  placeholder="Repita a senha"
                  value={formData.confirmSenha}
                  onChange={handleChange}
                  required
                  className={`mt-1 w-full rounded-lg border bg-white px-3 py-2.5 pr-12 text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 transition ${
                    passwordsMatch
                      ? "border-slate-200 focus:ring-sky-500 focus:border-sky-500"
                      : "border-amber-300 focus:ring-amber-400"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmSenha((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 text-sm px-2 py-1"
                  aria-label={showConfirmSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showConfirmSenha ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              {formData.confirmSenha.length > 0 && (
                <p
                  className={`mt-1 text-xs ${
                    formData.senha === formData.confirmSenha
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }`}
                >
                  {formData.senha === formData.confirmSenha
                    ? "Senhas conferem."
                    : "As senhas não conferem."}
                </p>
              )}
            </div>

            {/* NOVO: bloco completo de Médico */}
            {tipo === "medico" && (
              <div className="space-y-4 border rounded-lg p-4">
                <p className="font-semibold">Dados do Médico</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">CRM</label>
                    <input
                      type="text"
                      name="crm"
                      placeholder="CRM"
                      value={medicoForm.crm}
                      onChange={handleMedicoChange}
                      maxLength={7}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Especialidade</label>
                    <input
                      type="text"
                      name="especialidade"
                      placeholder="Ex.: Cardiologia"
                      value={medicoForm.especialidade}
                      onChange={handleMedicoChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Instituição de Formação</label>
                    <input
                      type="text"
                      name="instituicaoFormacao"
                      placeholder="Universidade"
                      value={medicoForm.instituicaoFormacao}
                      onChange={handleMedicoChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Ano de Formação</label>
                    <input
                      type="number"
                      name="anoFormacao"
                      placeholder="YYYY"
                      value={medicoForm.anoFormacao}
                      onChange={handleMedicoChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Residência (se aplicável)</label>
                    <input
                      type="text"
                      name="residencia"
                      placeholder="Residência Médica"
                      value={medicoForm.residencia}
                      onChange={handleMedicoChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Instituição da Residência</label>
                    <input
                      type="text"
                      name="instituicaoResidencia"
                      placeholder="Instituição"
                      value={medicoForm.instituicaoResidencia}
                      onChange={handleMedicoChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Ano da Residência</label>
                    <input
                      type="number"
                      name="anoResidencia"
                      placeholder="YYYY"
                      value={medicoForm.anoResidencia}
                      onChange={handleMedicoChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Experiência</label>
                  <textarea
                    name="experiencia"
                    placeholder="Resumo da experiência"
                    value={medicoForm.experiencia}
                    onChange={handleMedicoChange}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Motivação</label>
                  <textarea
                    name="motivacao"
                    placeholder="Por que deseja se cadastrar como médico na plataforma?"
                    value={medicoForm.motivacao}
                    onChange={handleMedicoChange}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <p className="font-medium">Documentos</p>

                  <DocUpload
                    label="Diploma de Medicina"
                    required
                    icon="🎓"
                    accept=".pdf,image/*"
                    file={medicoForm.documentos.diplomaMedicina}
                    inputRef={diplomaInputRef}
                    onFile={(file) => handleMedicoDocChange("diplomaMedicina", file)}
                    onRemove={() => removeMedicoDoc("diplomaMedicina", diplomaInputRef)}
                  />

                  <DocUpload
                    label="Certificado de Residência"
                    icon="🏅"
                    accept=".pdf,image/*"
                    file={medicoForm.documentos.certificadoResidencia}
                    inputRef={residenciaInputRef}
                    onFile={(file) => handleMedicoDocChange("certificadoResidencia", file)}
                    onRemove={() => removeMedicoDoc("certificadoResidencia", residenciaInputRef)}
                  />

                  <DocUpload
                    label="Comprovante de Experiência"
                    icon="📄"
                    accept=".pdf,image/*"
                    file={medicoForm.documentos.comprovanteExperiencia}
                    inputRef={experienciaInputRef}
                    onFile={(file) => handleMedicoDocChange("comprovanteExperiencia", file)}
                    onRemove={() => removeMedicoDoc("comprovanteExperiencia", experienciaInputRef)}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-semibold text-white bg-app-gradient hover:opacity-90 shadow-app transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading
                ? "Registrando..."
                : `Registrar ${({ paciente: "Paciente", clinica: "Clínica", medico: "Médico" }[tipo] || "Usuário")}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
