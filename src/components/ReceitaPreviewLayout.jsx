import React from "react"
import { DEFAULT_TEMPLATE_CONFIG } from "@/utils/pdfTemplateUtils"

/**
 * Layout compartilhado da receita, idêntico ao preview do médico.
 * Permite gerar PDF a partir do mesmo DOM (via html2canvas/jsPDF).
 */
export default function ReceitaPreviewLayout({
  id = "receita-preview",
  templateConfig,
  doctorLogo,
  // Dados do médico
  medico = "",
  crm = "",
  especialidade = "",
  endereco_consultorio = "",
  telefone_consultorio = "",
  email_medico = "",
  // Dados do paciente
  nome_paciente = "",
  idade = "",
  cpf = "",
  data_nascimento = "",
  // Dados da receita
  data_emissao = "",
  validade_receita = "",
  // Assinatura digital
  isSigned = false,
  certInfo = null,
  signDate = null,
  // Itens
  hasStructuredItems = false,
  receitaItems = [],
  // Campos legados (quando não estruturado)
  medicamento = "",
  posologia = "",
  observacoes = "",
}) {
  const cfg = templateConfig || DEFAULT_TEMPLATE_CONFIG
  const templateStyles = {
    titleSize: `${cfg?.content?.fontSize?.title ?? 16}px`,
    smallSize: `${cfg?.content?.fontSize?.small ?? 12}px`,
    primaryColor: cfg?.content?.colors?.primary ?? "#1f2937",
    secondaryColor: cfg?.content?.colors?.secondary ?? "#6b7280",
    accentBorderColor: cfg?.header?.borderColor ?? "#e5e7eb",
    showLogo: cfg?.header?.showLogo !== false,
  }

  return (
    <div id={id} className="mx-auto bg-white shadow-md border rounded-md p-6 max-w-[800px] aspect-[1/1.414] overflow-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b pb-3" style={{ borderBottomColor: templateStyles.accentBorderColor }}>
        {templateStyles.showLogo && doctorLogo?.data ? (
          <img src={doctorLogo.data} alt="Logo" className="max-h-20 max-w-[150px] object-contain" />
        ) : null}
        <div className="text-right flex-1 ml-4">
          <div className="font-bold" style={{ fontSize: templateStyles.titleSize, color: templateStyles.primaryColor }}>
            {cfg?.branding?.clinicName || medico || "Consultório Médico"}
          </div>
          {cfg?.header?.showDoctorInfo && (
            <>
              <div className="font-semibold" style={{ color: templateStyles.primaryColor }}>{medico}</div>
              {crm && (
                <div style={{ fontSize: templateStyles.smallSize, color: templateStyles.secondaryColor }}>CRM: {crm}</div>
              )}
            </>
          )}
          <div className="text-sm" style={{ fontSize: templateStyles.smallSize, color: templateStyles.secondaryColor }}>
            {cfg?.branding?.clinicAddress || endereco_consultorio}
          </div>
          <div className="text-sm" style={{ fontSize: templateStyles.smallSize, color: templateStyles.secondaryColor }}>
            Telefone: {cfg?.branding?.clinicPhone || telefone_consultorio}
          </div>
          {(cfg?.branding?.clinicEmail || email_medico) ? (
            <div className="text-sm" style={{ fontSize: templateStyles.smallSize, color: templateStyles.secondaryColor }}>
              E-mail: {cfg?.branding?.clinicEmail || email_medico}
            </div>
          ) : null}
        </div>
      </div>

      {/* Corpo */}
      <div className="text-center my-4">
        <div><span className="font-medium">Nome do Paciente: </span>{nome_paciente}</div>
        <div><span className="font-medium">Idade: </span>{idade}</div>
        <div><span className="font-medium">CPF: </span>{cpf}</div>
        <div><span className="font-medium">Data de Nascimento: </span>{data_nascimento}</div>
      </div>

      <div className="text-center text-xl font-semibold my-4">
        Prescrição Médica
        {isSigned && (
          <div className="text-sm text-green-600 font-normal mt-1">
            ✓ Assinada Digitalmente
          </div>
        )}
        {!isSigned && (
          <div className="text-sm text-orange-600 font-normal mt-1">
            ⚠ Aguardando Assinatura Digital
          </div>
        )}
      </div>

      <div className="text-center">
        {hasStructuredItems ? (
          <div className="space-y-4">
            {Array.isArray(receitaItems) && receitaItems.map((item, index) => {
              const nome = item?.medicamento?.nome || item?.descricao || `Medicamento ${index + 1}`
              const apresentacao = item?.medicamento?.apresentacao
              const dose = item?.dose || item?.dosagem
              const frequencia = item?.frequencia
              const duracao = item?.duracao
              const posologiaStr = [dose, frequencia, duracao].filter(Boolean).join(' • ')
              const obs = item?.observacoes
              return (
                <div key={index} className="border-b border-muted pb-3 last:border-b-0">
                  <div className="font-semibold">{nome}</div>
                  {apresentacao && (
                    <div className="text-sm text-muted-foreground mt-1">{apresentacao}</div>
                  )}
                  {posologiaStr && (
                    <div className="mt-2">{posologiaStr}</div>
                  )}
                  {obs && (
                    <div className="text-sm text-muted-foreground mt-1 italic">{obs}</div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <>
            <div className="whitespace-pre-wrap font-semibold">{medicamento}</div>
            {posologia ? (
              <div className="mt-2 whitespace-pre-wrap">{posologia}</div>
            ) : null}
            {observacoes ? (
              <div className="mt-2 whitespace-pre-wrap italic text-muted-foreground">{observacoes}</div>
            ) : null}
          </>
        )}
      </div>

      <div className="text-center my-6">
        <div>Data de Emissão: {data_emissao}</div>
        <div>Validade da Receita: {validade_receita || ""}</div>
      </div>

      {/* Assinatura/QR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start mt-6">
        <div className="text-center">
          <div className="mx-auto w-64 border-t pt-1">&nbsp;</div>
          {medico && (
            <div>Dr(a). {medico}{crm ? ` • CRM ${crm}` : ""}</div>
          )}
          {isSigned ? (
            <div className="text-xs text-muted-foreground mt-1">
              Assinado digitalmente conforme ICP-Brasil
              {certInfo?.subject_name || certInfo?.nome || certInfo?.subject ? (
                <> • Titular: {certInfo?.subject_name || certInfo?.nome || certInfo?.subject}</>
              ) : null}
              {crm ? (
                <> • CRM: {crm}</>
              ) : null}
              {cpf ? (
                <> • CPF: {cpf}</>
              ) : null}
              {certInfo?.algorithm ? (
                <> • Algoritmo: {certInfo.algorithm}</>
              ) : (
                <> • Algoritmo: SHA256-RSA</>
              )}
              {signDate ? (
                <> • Carimbo: {new Date(signDate).toLocaleString()}</>
              ) : null}
              {(certInfo?.valid_to || certInfo?.not_after || certInfo?.valid_until) ? (
                <> • Válido até: {new Date(certInfo?.valid_to || certInfo?.not_after || certInfo?.valid_until).toLocaleDateString()}</>
              ) : null}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground mt-1">
              Documento gerado. Assine para exibir o selo de assinatura digital.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}