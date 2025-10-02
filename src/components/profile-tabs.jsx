import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"

export function ProfileTabs({ tabs, basePath }) {
  const location = useLocation()

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6">
      <nav className="flex space-x-1 p-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.href
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-md",
                isActive
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105"
                  : "text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 dark:text-gray-200 dark:hover:text-white dark:hover:bg-gray-700/70"
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
