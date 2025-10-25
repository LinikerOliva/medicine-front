import { forwardRef } from "react"
import ReactDatePicker from "react-datepicker"
import { format, parseISO } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// Importa os estilos padrão e aplica overrides em index.css
import "react-datepicker/dist/react-datepicker.css"
import "@/styles/datepicker.css"

// Input customizado para manter o visual do projeto
const DateInput = forwardRef(({ value, onClick, placeholder, className, id, name }, ref) => {
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        ref={ref}
        value={value || ""}
        onClick={onClick}
        readOnly
        placeholder={placeholder || "DD/MM/AAAA"}
        className={cn("pr-10", className)}
      />
      <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    </div>
  )
})
DateInput.displayName = "DateInput"

// Componente DatePicker
export function DatePicker({
  id,
  name,
  value, // string ISO: YYYY-MM-DD
  onChange, // recebe string ISO
  className,
  minDate,
  maxDate,
  required,
}) {
  const selected = value ? parseISO(`${value}`) : null

  return (
    <ReactDatePicker
      selected={selected}
      onChange={(date) => {
        if (!date) {
          onChange?.("")
          return
        }
        onChange?.(format(date, "yyyy-MM-dd"))
      }}
      customInput={<DateInput id={id} name={name} className={className} />}
      dateFormat="dd/MM/yyyy"
      placeholderText="DD/MM/AAAA"
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      minDate={minDate}
      maxDate={maxDate}
      calendarClassName="dp-modern"
      popperClassName="dp-popper"
      required={required}
    />
  )
}