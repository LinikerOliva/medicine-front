import { forwardRef } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const Checkbox = forwardRef(({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
  const handleChange = (e) => {
    if (onCheckedChange) {
      onCheckedChange(e.target.checked)
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <input
        type="checkbox"
        ref={ref}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
        {...props}
      />
      <div
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
          "transition-all duration-200 cursor-pointer",
          checked 
            ? "bg-primary border-primary text-primary-foreground" 
            : "border-input bg-background hover:border-primary/50",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        onClick={() => !disabled && onCheckedChange && onCheckedChange(!checked)}
      >
        {checked && (
          <Check className="h-3 w-3 text-current flex items-center justify-center w-full h-full" />
        )}
      </div>
    </div>
  )
})

Checkbox.displayName = "Checkbox"

export { Checkbox }