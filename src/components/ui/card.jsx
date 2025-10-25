import { forwardRef } from "react"
import { cn } from "@/lib/utils"

const Card = forwardRef(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "card-medical",
    elevated: "card-elevated",
    medical: "card-medical",
    priority: "card-medical", // Base para cards com prioridade
  }

  return (
    <div 
      ref={ref} 
      className={cn(
        "animate-fade-in", // Animação suave de entrada
        variants[variant],
        className
      )} 
      {...props} 
    />
  )
})
Card.displayName = "Card"

const CardHeader = forwardRef(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn(
      "flex flex-col space-y-2 p-6 pb-4", 
      className
    )} 
    {...props} 
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = forwardRef(({ className, level = "h3", ...props }, ref) => {
  const Component = level
  return (
    <Component 
      ref={ref} 
      className={cn(
        "text-xl font-semibold leading-tight tracking-tight text-heading-foreground",
        "flex items-center gap-2", // Para ícones junto ao título
        className
      )} 
      {...props} 
    />
  )
})
CardTitle.displayName = "CardTitle"

const CardDescription = forwardRef(({ className, ...props }, ref) => (
  <p 
    ref={ref} 
    className={cn(
      "text-sm text-muted-foreground leading-relaxed", 
      className
    )} 
    {...props} 
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = forwardRef(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn(
      "p-6 pt-0 space-y-4", // Espaçamento consistente entre elementos
      className
    )} 
    {...props} 
  />
))
CardContent.displayName = "CardContent"

const CardFooter = forwardRef(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn(
      "flex items-center justify-between p-6 pt-0 border-t border-border/50 mt-4",
      className
    )} 
    {...props} 
  />
))
CardFooter.displayName = "CardFooter"

// Componente especializado para status médicos
const CardStatus = forwardRef(({ className, status = "normal", children, ...props }, ref) => {
  const statusClasses = {
    normal: "status-normal",
    attention: "status-attention", 
    critical: "status-critical",
    urgent: "status-urgent"
  }

  return (
    <div 
      ref={ref}
      className={cn(
        "status-badge",
        statusClasses[status],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
CardStatus.displayName = "CardStatus"

// Componente para prioridade médica
const CardPriority = forwardRef(({ className, priority = "low", children, ...props }, ref) => {
  const priorityClasses = {
    low: "card-priority-low",
    medium: "card-priority-medium",
    high: "card-priority-high"
  }

  return (
    <div 
      ref={ref}
      className={cn(
        "card-medical",
        priorityClasses[priority],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
CardPriority.displayName = "CardPriority"

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardStatus,
  CardPriority
}
