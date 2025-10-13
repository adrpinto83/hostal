import { NavLink } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
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
  onNavigate?: () => void;
};

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

const SECTIONS: NavSection[] = [
  {
    title: "Principal",
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Gestión",
    items: [
      { to: "/reservations", label: "Reservas", icon: CalendarDays },
      { to: "/guests", label: "Huéspedes", icon: Users },
      { to: "/rooms", label: "Habitaciones", icon: BedDouble },
      { to: "/rates", label: "Tarifas", icon: BadgeDollarSign },
      { to: "/devices", label: "Dispositivos", icon: Cpu },
    ],
  },
  {
    title: "Analítica",
    items: [{ to: "/reports", label: "Reportes", icon: BarChart3 }],
  },
  {
    title: "Preferencias",
    items: [{ to: "/settings", label: "Configuración", icon: Settings }],
  },
];

export default function Sidebar({ onNavigate }: SidebarProps) {
  const [brandColor, setBrandColor] = useState("#2563eb");

  const brandName = useMemo(
    () =>
      localStorage.getItem("brand.name") ||
      (import.meta.env.VITE_BRAND_NAME as string) ||
      "Sistema Hostales",
    []
  );

  const brandTagline = useMemo(
    () =>
      (import.meta.env.VITE_BRAND_TAGLINE as string) ||
      localStorage.getItem("brand.tagline") ||
      "Gestión ágil para hostales",
    []
  );

  useEffect(() => {
    const stored = localStorage.getItem("brand.primary");
    const envPrimary = (import.meta.env.VITE_BRAND_PRIMARY as string) || "";
    setBrandColor(stored || envPrimary || "#2563eb");
  }, []);

  return (
    <aside
      className="h-full w-64 shrink-0 border-r border-slate-200 bg-white"
      role="navigation"
      aria-label="Barra lateral"
    >
      {/* Brand (único) */}
      <div className="flex items-center gap-3 px-4 py-4">
        <BrandLogo size={36} showName={false} />
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-800">{brandName}</div>
          <div className="text-xs text-slate-500">{brandTagline}</div>
        </div>
      </div>

      <div className="h-px bg-slate-200 mx-4" />

      {/* Navegación (scrollable) */}
      <div className="mt-2 h-[calc(100%-4.5rem)] overflow-y-auto px-2 pb-4">
        {SECTIONS.map((section, idx) => (
          <div key={idx} className={idx > 0 ? "mt-4" : ""}>
            {section.title && (
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500/70">
                {section.title}
              </div>
            )}

            <ul className="mt-1 space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        [
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
                          isActive
                            ? "bg-slate-100 text-slate-900"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                        ].join(" ")
                      }
                      style={({ isActive }) =>
                        isActive
                          ? { boxShadow: `inset 3px 0 0 0 ${brandColor}` }
                          : undefined
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            size={18}
                            className={
                              isActive
                                ? "text-slate-900"
                                : "text-slate-500 group-hover:text-slate-800"
                            }
                          />
                          <span className="truncate">{item.label}</span>
                          {isActive && (
                            <span
                              aria-hidden="true"
                              className="ml-auto h-2 w-2 rounded-full"
                              style={{ backgroundColor: brandColor }}
                            />
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
        </div>
        ))}

        {/* Footer lateral opcional */}
        {/* <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <div className="font-medium text-slate-700">¿Necesitas ayuda?</div>
          <p className="mt-1 leading-relaxed">Visita la documentación o contacta soporte.</p>
        </div> */}
      </div>
    </aside>
  );
}
