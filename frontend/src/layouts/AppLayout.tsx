import { useAuth } from "@/context/AuthContext";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import BrandLogo from "@/components/BrandLogo";
import { Menu, LogOut, UserRound } from "lucide-react";

export default function AppLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [brandColor, setBrandColor] = useState("#2563eb");

  const menuRef = useRef<HTMLDivElement | null>(null);

  // Brand settings
  const brandName =
    localStorage.getItem("brand.name") ||
    (import.meta.env.VITE_BRAND_NAME as string) ||
    "Sistema Hostales";
  const brandPrimary =
    localStorage.getItem("brand.primary") ||
    (import.meta.env.VITE_BRAND_PRIMARY as string) ||
    "#2563eb";

  useEffect(() => {
    setBrandColor(brandPrimary);
    document.documentElement.style.setProperty("--brand-primary", brandPrimary);
  }, [brandPrimary]);

  // Cierra el menú de usuario al hacer click fuera
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  // Cierra overlays al navegar
  useEffect(() => {
    setMenuOpen(false);
    setSidebarOpen(false);
  }, [location.pathname]);

  // Escape para cerrar overlays
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setSidebarOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Bloquea scroll del body cuando el sidebar móvil está abierto
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar desktop */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Overlay + Sidebar móvil */}
      {sidebarOpen && (
        <button
          aria-label="Cerrar menú lateral"
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div
        className={`fixed z-50 h-full md:hidden transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!sidebarOpen}
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Topbar */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 py-3 shadow-sm"
          style={{ backgroundColor: brandColor }}
          role="banner"
        >
          <div className="flex items-center gap-3">
            {/* Hamburguesa móvil */}
            <button
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú lateral"
              aria-haspopup="true"
              aria-expanded={sidebarOpen}
            >
              <Menu size={18} />
            </button>

            {/* Marca compacta (móvil) */}
            <div className="flex items-center gap-3 md:hidden">
              <BrandLogo size={30} />
              <span className="text-white/95 text-sm font-semibold">{brandName}</span>
            </div>
          </div>

          {/* Perfil / menú */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((p) => !p)}
              className="relative flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls="topbar-user-menu"
            >
              <span className="h-7 w-7 flex items-center justify-center rounded-full bg-white/20">
                <UserRound size={16} />
              </span>
              <span className="hidden sm:block truncate max-w-[180px]">
                {user?.email || "Administrador"}
              </span>
            </button>

            {menuOpen && (
              <div
                id="topbar-user-menu"
                role="menu"
                aria-label="Menú de usuario"
                className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-lg"
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/profile");
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                >
                  <UserRound size={16} />
                  Perfil
                </button>
                <hr className="my-1 border-slate-200" />
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>

        <footer className="border-t border-slate-200 py-3 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} {brandName}. Todos los derechos reservados.
        </footer>
      </div>
    </div>
  );
}
