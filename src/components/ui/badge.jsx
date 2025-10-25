import { cn } from "@/lib/utils"

function Badge({ className, variant = "default", size = "default", ...props }) {
  const variants = {
    // Variantes básicas
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground border border-input hover:bg-accent hover:text-accent-foreground",
    
    // Variantes médicas especializadas
    success: "bg-success text-success-foreground hover:bg-success/80 border-success/20",
    warning: "bg-warning text-warning-foreground hover:bg-warning/80 border-warning/20",
    info: "bg-info text-info-foreground hover:bg-info/80 border-info/20",
    
    // Status médicos
    normal: "status-normal",
    attention: "status-attention",
    critical: "status-critical", 
    urgent: "status-urgent",
    
    // Prioridades médicas
    "priority-low": "bg-medical-gray/10 text-medical-gray border-medical-gray/20 hover:bg-medical-gray/20",
    "priority-medium": "bg-medical-orange/10 text-medical-orange border-medical-orange/20 hover:bg-medical-orange/20",
    "priority-high": "bg-medical-red/10 text-medical-red border-medical-red/20 hover:bg-medical-red/20",
    
    // Especialidades médicas
    "medical-primary": "bg-medical-primary/10 text-medical-primary border-medical-primary/20 hover:bg-medical-primary/20",
    "medical-secondary": "bg-medical-secondary/10 text-medical-secondary border-medical-secondary/20 hover:bg-medical-secondary/20",
    "medical-accent": "bg-medical-accent/10 text-medical-accent border-medical-accent/20 hover:bg-medical-accent/20",
  }

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    default: "px-2.5 py-0.5 text-xs",
    lg: "px-3 py-1 text-sm",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border font-medium transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "active:scale-95", // Micro-interação
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}

// Badge especializado para status de paciente
function PatientStatusBadge({ status, className, ...props }) {
  const statusConfig = {
    active: { variant: "success", text: "Ativo" },
    inactive: { variant: "secondary", text: "Inativo" },
    pending: { variant: "warning", text: "Pendente" },
    critical: { variant: "critical", text: "Crítico" },
    urgent: { variant: "urgent", text: "Urgente" },
  }

  const config = statusConfig[status] || statusConfig.active

  return (
    <Badge 
      variant={config.variant}
      className={cn("font-medium", className)}
      {...props}
    >
      {config.text}
    </Badge>
  )
}

// Badge para prioridade de consulta
function ConsultationPriorityBadge({ priority, className, ...props }) {
  const priorityConfig = {
    low: { variant: "priority-low", text: "Baixa" },
    medium: { variant: "priority-medium", text: "Média" },
    high: { variant: "priority-high", text: "Alta" },
  }

  const config = priorityConfig[priority] || priorityConfig.low

  return (
    <Badge 
      variant={config.variant}
      className={cn("font-medium", className)}
      {...props}
    >
      {config.text}
    </Badge>
  )
}

export { Badge, PatientStatusBadge, ConsultationPriorityBadge }
