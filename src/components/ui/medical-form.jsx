import { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { Label } from "./label"
import { Input } from "./input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { Badge } from "./badge"
import { Heart, AlertTriangle, CheckCircle, Clock, User, Stethoscope, Activity } from "lucide-react"

// Componente de Input Médico Especializado
const MedicalInput = forwardRef(({ 
  className, 
  type, 
  variant = "default",
  priority = "normal",
  status,
  icon: Icon,
  ...props 
}, ref) => {
  const variants = {
    default: "border-input focus-visible:ring-ring",
    medical: "border-medical-primary/20 focus-visible:ring-medical-primary/20 bg-medical-primary/5",
    vital: "border-orange-200 focus-visible:ring-orange-200 bg-orange-50/50",
    critical: "border-red-200 focus-visible:ring-red-200 bg-red-50/50",
    success: "border-green-200 focus-visible:ring-green-200 bg-green-50/50"
  }

  const priorities = {
    low: "border-l-4 border-l-blue-400",
    normal: "border-l-4 border-l-medical-primary",
    high: "border-l-4 border-l-orange-400",
    urgent: "border-l-4 border-l-red-400"
  }

  return (
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
          <Icon className="h-4 w-4 text-medical-primary/60" />
        </div>
      )}
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
          variants[variant],
          priorities[priority],
          Icon && "pl-10",
          className,
        )}
        ref={ref}
        {...props}
      />
      {status && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {status === "valid" && <CheckCircle className="h-4 w-4 text-green-500" />}
          {status === "invalid" && <AlertTriangle className="h-4 w-4 text-red-500" />}
          {status === "pending" && <Clock className="h-4 w-4 text-orange-500" />}
        </div>
      )}
    </div>
  )
})
MedicalInput.displayName = "MedicalInput"

// Componente de Label Médico
const MedicalLabel = forwardRef(({ 
  className, 
  required = false,
  priority = "normal",
  icon: Icon,
  children,
  ...props 
}, ref) => {
  const priorities = {
    low: "text-blue-700",
    normal: "text-medical-primary",
    high: "text-orange-700",
    urgent: "text-red-700"
  }

  return (
    <Label
      ref={ref}
      className={cn(
        "text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2",
        priorities[priority],
        className
      )}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </Label>
  )
})
MedicalLabel.displayName = "MedicalLabel"

// Componente de Select Médico
const MedicalSelect = forwardRef(({ 
  className,
  variant = "default",
  priority = "normal",
  ...props 
}, ref) => {
  const variants = {
    default: "border-input focus:ring-ring",
    medical: "border-medical-primary/20 focus:ring-medical-primary/20 bg-medical-primary/5",
    vital: "border-orange-200 focus:ring-orange-200 bg-orange-50/50",
    critical: "border-red-200 focus:ring-red-200 bg-red-50/50"
  }

  const priorities = {
    low: "border-l-4 border-l-blue-400",
    normal: "border-l-4 border-l-medical-primary",
    high: "border-l-4 border-l-orange-400",
    urgent: "border-l-4 border-l-red-400"
  }

  return (
    <SelectTrigger
      ref={ref}
      className={cn(
        "h-11 rounded-lg transition-all duration-200",
        variants[variant],
        priorities[priority],
        className
      )}
      {...props}
    />
  )
})
MedicalSelect.displayName = "MedicalSelect"

// Componente de Grupo de Formulário Médico
const MedicalFormGroup = ({ 
  children, 
  className,
  variant = "default",
  ...props 
}) => {
  const variants = {
    default: "space-y-2",
    medical: "space-y-3 p-4 rounded-xl bg-medical-primary/5 border border-medical-primary/10",
    vital: "space-y-3 p-4 rounded-xl bg-orange-50/50 border border-orange-200",
    critical: "space-y-3 p-4 rounded-xl bg-red-50/50 border border-red-200"
  }

  return (
    <div 
      className={cn(variants[variant], className)} 
      {...props}
    >
      {children}
    </div>
  )
}

// Componente de Campo de Sinais Vitais
const VitalSignInput = forwardRef(({ 
  label,
  unit,
  normalRange,
  value,
  className,
  icon: Icon = Activity,
  ...props 
}, ref) => {
  const isInNormalRange = (val, range) => {
    if (!val || !range) return null
    const numVal = parseFloat(val)
    const [min, max] = range.split('-').map(Number)
    return numVal >= min && numVal <= max
  }

  const rangeStatus = isInNormalRange(value, normalRange)

  return (
    <MedicalFormGroup variant="vital">
      <MedicalLabel 
        icon={Icon}
        priority={rangeStatus === false ? "high" : "normal"}
      >
        {label}
        {unit && <span className="text-muted-foreground font-normal">({unit})</span>}
      </MedicalLabel>
      <MedicalInput
        ref={ref}
        variant="vital"
        priority={rangeStatus === false ? "high" : "normal"}
        status={rangeStatus === true ? "valid" : rangeStatus === false ? "invalid" : undefined}
        value={value}
        className={className}
        {...props}
      />
      {normalRange && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Faixa normal: {normalRange} {unit}
          </span>
          {rangeStatus !== null && (
            <Badge 
              variant={rangeStatus ? "success" : "destructive"}
              className="text-xs"
            >
              {rangeStatus ? "Normal" : "Alterado"}
            </Badge>
          )}
        </div>
      )}
    </MedicalFormGroup>
  )
})
VitalSignInput.displayName = "VitalSignInput"

// Componente de Campo de Medicamento
const MedicationInput = forwardRef(({ 
  medication,
  dosage,
  frequency,
  onMedicationChange,
  onDosageChange,
  onFrequencyChange,
  className,
  ...props 
}, ref) => {
  return (
    <MedicalFormGroup variant="medical" className={className}>
      <MedicalLabel icon={Heart} required>
        Medicamento
      </MedicalLabel>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-2">
          <MedicalLabel className="text-xs text-muted-foreground">Nome</MedicalLabel>
          <MedicalInput
            variant="medical"
            placeholder="Nome do medicamento"
            value={medication}
            onChange={onMedicationChange}
            icon={Heart}
          />
        </div>
        <div className="space-y-2">
          <MedicalLabel className="text-xs text-muted-foreground">Dosagem</MedicalLabel>
          <MedicalInput
            variant="medical"
            placeholder="Ex: 500mg"
            value={dosage}
            onChange={onDosageChange}
          />
        </div>
        <div className="space-y-2">
          <MedicalLabel className="text-xs text-muted-foreground">Frequência</MedicalLabel>
          <Select value={frequency} onValueChange={onFrequencyChange}>
            <MedicalSelect variant="medical">
              <SelectValue placeholder="Selecione" />
            </MedicalSelect>
            <SelectContent>
              <SelectItem value="1x">1x ao dia</SelectItem>
              <SelectItem value="2x">2x ao dia</SelectItem>
              <SelectItem value="3x">3x ao dia</SelectItem>
              <SelectItem value="4x">4x ao dia</SelectItem>
              <SelectItem value="6x">6x ao dia</SelectItem>
              <SelectItem value="8x">8x ao dia</SelectItem>
              <SelectItem value="12x">12x ao dia</SelectItem>
              <SelectItem value="sos">SOS (se necessário)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </MedicalFormGroup>
  )
})
MedicationInput.displayName = "MedicationInput"

// Componente de Campo de Paciente
const PatientInfoInput = forwardRef(({ 
  patientName,
  patientId,
  patientAge,
  patientGender,
  className,
  ...props 
}, ref) => {
  return (
    <MedicalFormGroup variant="medical" className={className}>
      <MedicalLabel icon={User}>
        Informações do Paciente
      </MedicalLabel>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-2">
          <MedicalLabel className="text-xs text-muted-foreground">Nome</MedicalLabel>
          <MedicalInput
            variant="medical"
            value={patientName}
            readOnly
            className="bg-muted/50"
          />
        </div>
        <div className="space-y-2">
          <MedicalLabel className="text-xs text-muted-foreground">ID</MedicalLabel>
          <MedicalInput
            variant="medical"
            value={patientId}
            readOnly
            className="bg-muted/50"
          />
        </div>
        <div className="space-y-2">
          <MedicalLabel className="text-xs text-muted-foreground">Idade</MedicalLabel>
          <MedicalInput
            variant="medical"
            value={patientAge}
            readOnly
            className="bg-muted/50"
          />
        </div>
        <div className="space-y-2">
          <MedicalLabel className="text-xs text-muted-foreground">Sexo</MedicalLabel>
          <MedicalInput
            variant="medical"
            value={patientGender}
            readOnly
            className="bg-muted/50"
          />
        </div>
      </div>
    </MedicalFormGroup>
  )
})
PatientInfoInput.displayName = "PatientInfoInput"

export {
  MedicalInput,
  MedicalLabel,
  MedicalSelect,
  MedicalFormGroup,
  VitalSignInput,
  MedicationInput,
  PatientInfoInput
}