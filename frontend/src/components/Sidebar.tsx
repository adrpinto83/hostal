import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  BedDouble,
  BadgeDollarSign,
  Cpu,
  BarChart3,
  Settings,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

type SidebarProps = {
  onNavigate?: () => void; // para cerrar en móvil al navegar
};

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/reservations", label: "Reservas", icon: CalendarDays },
  { to: "/guests", label: "Huéspedes", icon: Users },
  { to: "/rooms", label: "Habitaciones", icon: BedDouble },
  { to: "/rates", label: "Tarifas", icon: BadgeDollarSign },
  { to: "/devices", label: "Dispositivos", icon: Cpu },
  { to: "/reports", label: "Reportes", icon: BarChart3 },
  { to: "/settings", label: "Configuración", icon: Settings },
];

export default function Sidebar({ onNavigate }: SidebarProps) {
  const { pathname } = useLocation();
  const [brandColor, setBrandColor] = useState("#2563eb");

  useEffect(() => {
    const stored = localStorage.getItem("brand.primary");
    const envPrimary = import.meta.env.VITE_BRAND_PRIMARY as string;
    setBrandColor(stored || envPrimary || "#2563eb");
  }, []);

  const brandName =
    localStorage.getItem("brand.name") ||
    (import.meta.env.VITE_BRAND_NAME as string) ||
    "Sistema Hostales";

  return (
    <aside className="h-full w-64 shrink-0 border-r border-slate-200 bg-white">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-4">
        <BrandLogo size={36} />
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-800">{brandName}</div>
          <div className="text-xs text-slate-500">Panel administrativo</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="mt-2 px-2">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition
                ${active ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
              style={active ? { boxShadow: `inset 3px 0 0 0 ${brandColor}` } : undefined}
            >
              <Icon
                size={18}
                className={active ? "text-slate-900" : "text-slate-500 group-hover:text-slate-800"}
              />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
