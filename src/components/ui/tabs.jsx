// Agora Tabs controla estado (value) e TabsContent só renderiza quando ativo
import { createContext, useContext, useState, forwardRef } from "react"
import { cn } from "@/lib/utils"

// Contexto para compartilhar o value atual entre Tabs/Trigger/Content
const TabsContext = createContext(null)

function useTabsContext() {
  const ctx = useContext(TabsContext)
  if (!ctx) {
    throw new Error("Tabs components must be used within <Tabs>")
  }
  return ctx
}

// Componente Tabs com modo controlado (value) e não controlado (defaultValue)
const Tabs = forwardRef(({ className, value: valueProp, defaultValue = "", onValueChange, children, ...props }, ref) => {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue)
  const isControlled = valueProp !== undefined
  const value = isControlled ? valueProp : uncontrolledValue

  const setValue = (next) => {
    if (!isControlled) setUncontrolledValue(next)
    onValueChange?.(next)
  }

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div ref={ref} className={cn("", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
})
Tabs.displayName = "Tabs"

const TabsList = forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className,
    )}
    {...props}
  />
))
TabsList.displayName = "TabsList"

// TabsTrigger agora recebe 'value' e ativa a respectiva aba
const TabsTrigger = forwardRef(({ className, value, onClick, ...props }, ref) => {
  const { value: active, setValue } = useTabsContext()
  const isActive = active === value

  const handleClick = (e) => {
    onClick?.(e)
    setValue(value)
  }

  return (
    <button
      ref={ref}
      data-state={isActive ? "active" : "inactive"}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50 hover:text-foreground",
        className,
      )}
      onClick={handleClick}
      {...props}
    />
  )
})
TabsTrigger.displayName = "TabsTrigger"

// TabsContent só renderiza quando a aba está ativa (ou sempre, se forceMount)
const TabsContent = forwardRef(({ className, value, forceMount = false, ...props }, ref) => {
  const { value: active } = useTabsContext()

  if (!forceMount && active !== value) {
    return null
  }

  return (
    <div
      ref={ref}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    />
  )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
