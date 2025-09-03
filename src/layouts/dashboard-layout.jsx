import { SidebarProvider, SidebarInset } from "../components/ui/sidebar"
import { ThemeToggle } from "../components/theme-toggle"
import { useUser } from "@/contexts/user-context"
import { Separator } from "../components/ui/separator"
import { cn } from "@/lib/utils"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../components/ui/breadcrumb"
import { SidebarTrigger } from "../components/ui/sidebar"

export function DashboardLayout({ children, sidebar: Sidebar, breadcrumbs = [] }) {
  const { activeRole } = useUser()

  // Header neutro (remove gradiente verde)
  const headerClasses = "bg-white/80 dark:bg-slate-900/70"

  // Fundo principal neutro seguindo o tema (remove gradiente por papel)
  const mainClasses = "bg-background"

  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset>
        <header
          className={cn(
            // header “card” em light + blur, com sombra suave e cantos arredondados na base
            "relative flex h-16 shrink-0 items-center gap-2 border-b px-6 rounded-b-xl shadow-sm backdrop-blur supports-[backdrop-filter]:backdrop-blur-md transition-all duration-300",
            headerClasses
          )}
        >
          {/* faixa/acento superior removida */}
          {/* <div
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 h-[3px] rounded-t-xl",
              "bg-green-500 dark:bg-green-600"
            )}
          /> */}
          <div className="flex items-center gap-2 flex-1">
            <SidebarTrigger className="mr-1" />
            {/* breadcrumbs */}
            {breadcrumbs.length > 0 && (
              <>
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbs.map((breadcrumb, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <BreadcrumbItem className="hidden md:block">
                          {breadcrumb.href ? (
                            <BreadcrumbLink
                              href={breadcrumb.href}
                              className={cn(
                                "text-sm font-medium transition-colors",
                                // Light neutro; Dark neutro (removido verde/azul por papel)
                                "text-slate-800 hover:text-slate-950",
                                "dark:text-slate-200 dark:hover:text-slate-100",
                              )}
                            >
                              {breadcrumb.label}
                            </BreadcrumbLink>
                          ) : (
                            <BreadcrumbPage
                              className={cn(
                                "text-sm font-semibold",
                                // Light/dark neutro
                                "text-slate-950",
                                "dark:text-slate-100",
                              )}
                            >
                              {breadcrumb.label}
                            </BreadcrumbPage>
                          )}
                        </BreadcrumbItem>
                        {index < breadcrumbs.length - 1 && (
                          <BreadcrumbSeparator
                            className={cn(
                              "hidden md:block",
                              // Light/dark neutro
                              "text-slate-400",
                              "dark:text-slate-300",
                            )}
                          />
                        )}
                      </div>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </>
            )}
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main
          className={cn(
            "flex flex-1 flex-col gap-4 px-6 pt-10 pb-6 min-h-[calc(100svh-4rem)] transition-all duration-300",
            mainClasses,
          )}
        >
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default DashboardLayout
