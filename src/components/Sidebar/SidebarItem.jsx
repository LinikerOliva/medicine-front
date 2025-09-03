import { Link, useLocation } from "react-router-dom"

export default function SidebarItem({ item }) {
  const location = useLocation()
  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/")
  const Icon = item.icon
  return (
    <li>
      <Link
        to={item.path}
        className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors data-[active=true]:bg-sidebar-accent/80 hover:bg-sidebar-accent/60 ${
          isActive ? "bg-sidebar-accent/80" : ""
        }`}
        data-active={isActive}
      >
        {Icon && <Icon className="size-4" />}
        <span className="text-sm">{item.label}</span>
      </Link>
    </li>
  )
}