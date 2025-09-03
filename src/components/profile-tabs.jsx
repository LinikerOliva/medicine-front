import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"

export function ProfileTabs({ tabs, basePath }) {
  const location = useLocation()

  return (
    <div className="border-b">
      <nav className="flex space-x-4 px-1">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.href
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                "flex items-center px-3 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "border-b-2 border-slate-900 text-slate-950 dark:text-slate-100 dark:border-slate-200"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
