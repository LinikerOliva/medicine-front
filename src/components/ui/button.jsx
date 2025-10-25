import { forwardRef } from "react"
import { cn } from "@/lib/utils"

const Button = forwardRef(({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
  const Comp = asChild ? "slot" : "button"

  const variants = {
    default: "btn-medical-primary",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
    outline: "btn-medical-secondary",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
    ghost: "btn-medical-ghost",
    link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
    // Variantes médicas especializadas
    medical: "btn-medical-primary",
    success: "bg-success text-success-foreground hover:bg-success/90 shadow-sm",
    warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm",
    info: "bg-info text-info-foreground hover:bg-info/90 shadow-sm",
  }

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-12 rounded-lg px-8 text-base",
    icon: "h-10 w-10",
    "icon-sm": "h-8 w-8",
    "icon-lg": "h-12 w-12",
  }

  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "active:scale-[0.98]", // Micro-interação de clique
        variants[variant],
        sizes[size],
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})

Button.displayName = "Button"

export { Button }
