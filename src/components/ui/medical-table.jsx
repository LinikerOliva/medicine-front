import { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "./badge"
import { Button } from "./button"
import { PatientStatusBadge, ConsultationPriorityBadge } from "./badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "./table"
import { 
  Heart, 
  User, 
  Calendar, 
  Clock, 
  Eye, 
  Edit, 
  FileText, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react"

// Componente de Tabela Médica Base
const MedicalTable = forwardRef(({ 
  className,
  variant = "default",
  ...props 
}, ref) => {
  const variants = {
    default: "border-border",
    medical: "border-medical-primary/20 bg-medical-primary/5",
    vital: "border-orange-200 bg-orange-50/30",
    critical: "border-red-200 bg-red-50/30"
  }

  return (
    <div className={cn("rounded-xl border overflow-hidden", variants[variant])}>
      <Table ref={ref} className={cn("", className)} {...props} />
    </div>
  )
})
MedicalTable.displayName = "MedicalTable"

// Componente de Cabeçalho de Tabela Médica
const MedicalTableHeader = forwardRef(({ 
  className,
  variant = "default",
  ...props 
}, ref) => {
  const variants = {
    default: "bg-muted/50",
    medical: "bg-gradient-to-r from-medical-primary/10 to-medical-secondary/10 border-b border-medical-primary/20",
    vital: "bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200",
    critical: "bg-gradient-to-r from-red-50 to-red-100 border-b border-red-200"
  }

  return (
    <TableHeader 
      ref={ref} 
      className={cn(variants[variant], className)} 
      {...props} 
    />
  )
})
MedicalTableHeader.displayName = "MedicalTableHeader"

// Componente de Linha de Tabela Médica
const MedicalTableRow = forwardRef(({ 
  className,
  priority = "normal",
  status,
  ...props 
}, ref) => {
  const priorities = {
    low: "border-l-4 border-l-blue-400",
    normal: "border-l-4 border-l-medical-primary/30",
    high: "border-l-4 border-l-orange-400",
    urgent: "border-l-4 border-l-red-400"
  }

  const statuses = {
    active: "bg-green-50/50 hover:bg-green-50",
    pending: "bg-orange-50/50 hover:bg-orange-50",
    completed: "bg-blue-50/50 hover:bg-blue-50",
    cancelled: "bg-red-50/50 hover:bg-red-50"
  }

  return (
    <TableRow 
      ref={ref} 
      className={cn(
        "hover:bg-muted/50 transition-colors duration-200",
        priorities[priority],
        status && statuses[status],
        className
      )} 
      {...props} 
    />
  )
})
MedicalTableRow.displayName = "MedicalTableRow"

// Componente de Célula com Status
const StatusTableCell = ({ 
  status, 
  children, 
  className,
  ...props 
}) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
      case "normal":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "pending":
      case "attention":
        return <Clock className="h-4 w-4 text-orange-500" />
      case "critical":
      case "urgent":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <TableCell className={cn("", className)} {...props}>
      <div className="flex items-center gap-2">
        {getStatusIcon(status)}
        {children}
      </div>
    </TableCell>
  )
}

// Componente de Tabela de Pacientes
const PatientTable = ({ 
  patients = [], 
  onViewPatient,
  onEditPatient,
  className,
  ...props 
}) => {
  return (
    <MedicalTable variant="medical" className={className} {...props}>
      <MedicalTableHeader variant="medical">
        <TableRow>
          <TableHead className="w-12"></TableHead>
          <TableHead className="font-semibold text-medical-primary">Paciente</TableHead>
          <TableHead className="font-semibold text-medical-primary">Idade</TableHead>
          <TableHead className="font-semibold text-medical-primary">Status</TableHead>
          <TableHead className="font-semibold text-medical-primary">Última Consulta</TableHead>
          <TableHead className="font-semibold text-medical-primary">Próxima Consulta</TableHead>
          <TableHead className="font-semibold text-medical-primary text-right">Ações</TableHead>
        </TableRow>
      </MedicalTableHeader>
      <TableBody>
        {patients.map((patient, index) => (
          <MedicalTableRow 
            key={patient.id || index}
            priority={patient.priority || "normal"}
            status={patient.status}
          >
            <TableCell>
              <div className="p-2 bg-medical-primary/10 rounded-lg">
                <User className="h-4 w-4 text-medical-primary" />
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <p className="font-semibold text-gray-900">{patient.nome}</p>
                <p className="text-sm text-muted-foreground">{patient.cpf}</p>
              </div>
            </TableCell>
            <TableCell>
              <span className="font-medium">{patient.idade} anos</span>
            </TableCell>
            <StatusTableCell status={patient.status}>
              <PatientStatusBadge status={patient.status || "ativo"} />
            </StatusTableCell>
            <TableCell>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {patient.ultima_consulta || "Nunca"}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {patient.proxima_consulta || "Não agendada"}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Button 
                  variant="btn-medical-ghost" 
                  size="sm"
                  onClick={() => onViewPatient?.(patient)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button 
                  variant="btn-medical-secondary" 
                  size="sm"
                  onClick={() => onEditPatient?.(patient)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </MedicalTableRow>
        ))}
      </TableBody>
    </MedicalTable>
  )
}

// Componente de Tabela de Consultas
const ConsultationTable = ({ 
  consultations = [], 
  onViewConsultation,
  onStartConsultation,
  className,
  ...props 
}) => {
  return (
    <MedicalTable variant="medical" className={className} {...props}>
      <MedicalTableHeader variant="medical">
        <TableRow>
          <TableHead className="w-12"></TableHead>
          <TableHead className="font-semibold text-medical-primary">Paciente</TableHead>
          <TableHead className="font-semibold text-medical-primary">Data/Hora</TableHead>
          <TableHead className="font-semibold text-medical-primary">Tipo</TableHead>
          <TableHead className="font-semibold text-medical-primary">Prioridade</TableHead>
          <TableHead className="font-semibold text-medical-primary">Status</TableHead>
          <TableHead className="font-semibold text-medical-primary text-right">Ações</TableHead>
        </TableRow>
      </MedicalTableHeader>
      <TableBody>
        {consultations.map((consultation, index) => (
          <MedicalTableRow 
            key={consultation.id || index}
            priority={consultation.prioridade || "normal"}
            status={consultation.status}
          >
            <TableCell>
              <div className="p-2 bg-medical-primary/10 rounded-lg">
                <Heart className="h-4 w-4 text-medical-primary" />
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <p className="font-semibold text-gray-900">{consultation.paciente_nome}</p>
                <p className="text-sm text-muted-foreground">ID: {consultation.paciente_id}</p>
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-medical-primary" />
                  <span className="font-medium">{consultation.data}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{consultation.hora}</span>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="bg-medical-primary/5 text-medical-primary border-medical-primary/20">
                {consultation.tipo || "Consulta Geral"}
              </Badge>
            </TableCell>
            <TableCell>
              <ConsultationPriorityBadge priority={consultation.prioridade || "normal"} />
            </TableCell>
            <StatusTableCell status={consultation.status}>
              <Badge 
                variant={
                  consultation.status === "agendada" ? "info" :
                  consultation.status === "em_andamento" ? "warning" :
                  consultation.status === "concluida" ? "success" :
                  "destructive"
                }
              >
                {consultation.status === "agendada" ? "Agendada" :
                 consultation.status === "em_andamento" ? "Em Andamento" :
                 consultation.status === "concluida" ? "Concluída" :
                 "Cancelada"}
              </Badge>
            </StatusTableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Button 
                  variant="btn-medical-ghost" 
                  size="sm"
                  onClick={() => onViewConsultation?.(consultation)}
                >
                  <FileText className="h-4 w-4" />
                </Button>
                {consultation.status === "agendada" && (
                  <Button 
                    variant="btn-medical-primary" 
                    size="sm"
                    onClick={() => onStartConsultation?.(consultation)}
                  >
                    <Activity className="h-4 w-4 mr-1" />
                    Iniciar
                  </Button>
                )}
              </div>
            </TableCell>
          </MedicalTableRow>
        ))}
      </TableBody>
    </MedicalTable>
  )
}

// Componente de Tabela de Exames
const ExamTable = ({ 
  exams = [], 
  onViewExam,
  onDownloadExam,
  className,
  ...props 
}) => {
  return (
    <MedicalTable variant="vital" className={className} {...props}>
      <MedicalTableHeader variant="vital">
        <TableRow>
          <TableHead className="w-12"></TableHead>
          <TableHead className="font-semibold text-orange-700">Exame</TableHead>
          <TableHead className="font-semibold text-orange-700">Data</TableHead>
          <TableHead className="font-semibold text-orange-700">Resultado</TableHead>
          <TableHead className="font-semibold text-orange-700">Status</TableHead>
          <TableHead className="font-semibold text-orange-700 text-right">Ações</TableHead>
        </TableRow>
      </MedicalTableHeader>
      <TableBody>
        {exams.map((exam, index) => (
          <MedicalTableRow 
            key={exam.id || index}
            priority={exam.priority || "normal"}
            status={exam.status}
          >
            <TableCell>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Activity className="h-4 w-4 text-orange-600" />
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <p className="font-semibold text-gray-900">{exam.nome}</p>
                <p className="text-sm text-muted-foreground">{exam.tipo}</p>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-orange-600" />
                <span className="font-medium">{exam.data}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge 
                variant={
                  exam.resultado === "normal" ? "success" :
                  exam.resultado === "alterado" ? "warning" :
                  exam.resultado === "critico" ? "destructive" :
                  "outline"
                }
              >
                {exam.resultado || "Pendente"}
              </Badge>
            </TableCell>
            <StatusTableCell status={exam.status}>
              <Badge 
                variant={
                  exam.status === "concluido" ? "success" :
                  exam.status === "em_andamento" ? "warning" :
                  exam.status === "agendado" ? "info" :
                  "outline"
                }
              >
                {exam.status === "concluido" ? "Concluído" :
                 exam.status === "em_andamento" ? "Em Andamento" :
                 exam.status === "agendado" ? "Agendado" :
                 "Pendente"}
              </Badge>
            </StatusTableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                  onClick={() => onViewExam?.(exam)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {exam.status === "concluido" && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-orange-200 text-orange-700 hover:bg-orange-50"
                    onClick={() => onDownloadExam?.(exam)}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </MedicalTableRow>
        ))}
      </TableBody>
    </MedicalTable>
  )
}

export {
  MedicalTable,
  MedicalTableHeader,
  MedicalTableRow,
  StatusTableCell,
  PatientTable,
  ConsultationTable,
  ExamTable
}