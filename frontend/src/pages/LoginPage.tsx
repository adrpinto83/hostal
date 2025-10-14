import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";
import http from "@/api/http"; // <-- usa el cliente axios central

type LoginResponse = {
  access_token: string;
  token_type: "bearer";
};

export default function Login() {
  const [email, setEmail] = useState("admin@hostal.com");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location.state?.from?.pathname || "/dashboard";

  // branding básico
  const brandName =
    localStorage.getItem("brand.name") ||
    (import.meta.env.VITE_BRAND_NAME as string) ||
    "Sistema Hostales";
  const brandPrimary =
    localStorage.getItem("brand.primary") ||
    (import.meta.env.VITE_BRAND_PRIMARY as string) ||
    "#2563eb";

  // Mostrar panel de setup si ?setup=1
  const setupMode = useMemo(
    () => new URLSearchParams(location.search).get("setup") === "1",
    [location.search]
  );

  useEffect(() => {
    document.title = `${brandName} · Iniciar sesión`;
    // Aplica el color de marca como CSS var para reusarlo en gradientes si quieres
    document.documentElement.style.setProperty("--brand-primary", brandPrimary);
  }, [brandName, brandPrimary]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const form = new URLSearchParams();
      form.append("username", email.trim());
      form.append("password", password);

      // http ya tiene baseURL = VITE_API_BASE_URL || http://localhost:8000/api/v1
      const { data } = await http.post<LoginResponse>("/auth/login", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      await login(data.access_token, { remember });
      navigate(from, { replace: true });
    } catch (err: any) {
      const apiDetail =
        err?.response?.data?.detail ||
        err?.message ||
        "No se pudo iniciar sesión";
      setError(String(apiDetail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* LADO IZQUIERDO · Branding */}
        <aside className="relative hidden overflow-hidden lg:block">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, var(--brand-primary, #2563eb) 0%, #1d4ed8 40%, #0f172a 100%)",
            }}
          />
          <div className="relative z-10 flex h-full flex-col p-10">
            <header>
              <BrandLogo size={40} showName />
            </header>

            <div className="mt-auto">
              <h2 className="mb-2 text-3xl font-bold leading-tight text-white">
                Bienvenido
              </h2>
              <p className="max-w-md text-white/85">
                Administra reservas, huéspedes y tarifas desde un solo lugar.
              </p>
            </div>

            <footer className="mt-10 text-xs text-white/70">
              © {new Date().getFullYear()} {brandName}. Todos los derechos
              reservados.
            </footer>
          </div>
        </aside>

        {/* LADO DERECHO · Formulario */}
        <main className="flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-8">
              {/* Logo compacto en móvil */}
              <div className="mb-4 block lg:hidden">
                <BrandLogo size={36} showName />
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
                Iniciar sesión
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Accede con tus credenciales de administrador o recepción.
              </p>
            </div>

            <form className="space-y-5" onSubmit={submit} noValidate>
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hostal.com"
                  required
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-pressed={show}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none"
                  >
                    {show ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Recordarme
                </label>
                <a
                  className="text-sm font-medium text-slate-500 hover:text-slate-700"
                  href="#"
                  onClick={(e) => e.preventDefault()}
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="group relative inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="absolute left-4 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Iniciando…
                  </>
                ) : (
                  "Entrar"
                )}
              </button>
            </form>

            {/* Panel de configuración rápida (solo si ?setup=1) */}
            {setupMode && <BrandQuickSetup />}
          </div>
        </main>
      </div>
    </div>
  );
}

/** Herramienta de branding (demo) persistiendo en localStorage */
function BrandQuickSetup() {
  const [name, setName] = useState(
    localStorage.getItem("brand.name") ||
      (import.meta.env.VITE_BRAND_NAME as string) ||
      "Sistema Hostales"
  );
  const [primary, setPrimary] = useState(
    localStorage.getItem("brand.primary") ||
      (import.meta.env.VITE_BRAND_PRIMARY as string) ||
      "#2563eb"
  );
  const [logoPreview, setLogoPreview] = useState<string | null>(
    localStorage.getItem("brand.logoDataUrl")
  );

  const onFile = (f?: File) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(String(reader.result || ""));
    reader.readAsDataURL(f);
  };

  const save = () => {
    try {
      if (logoPreview) localStorage.setItem("brand.logoDataUrl", logoPreview);
      localStorage.setItem("brand.name", name.trim());
      localStorage.setItem("brand.primary", primary.trim());
      alert("Brand guardado. Recarga la página para aplicarlo en todo el sitio.");
    } catch {
      alert("No se pudo guardar la configuración.");
    }
  };

  const reset = () => {
    localStorage.removeItem("brand.logoDataUrl");
    localStorage.removeItem("brand.name");
    localStorage.removeItem("brand.primary");
    setLogoPreview(null);
    alert("Brand eliminado. Recarga la página para limpiar.");
  };

  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-700">
        Configuración rápida de marca (demo)
      </h4>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm text-slate-600">Nombre</label>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mi Hostal"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-600">Color primario</label>
          <input
            type="color"
            className="h-10 w-full cursor-pointer rounded-lg border border-slate-300 bg-white"
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm text-slate-600">Logo (PNG/SVG)</label>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onFile(e.target.files?.[0] || undefined)}
            />
            {logoPreview && (
              <img
                src={logoPreview}
                alt="Preview"
                className="h-10 w-10 rounded-lg ring-1 ring-black/5 object-contain"
              />
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Consejo: usa un logo cuadrado con fondo transparente para mejor
            resultado.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Guardar brand
        </button>
        <button
          onClick={reset}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
        >
          Eliminar brand
        </button>
        <span className="text-xs text-slate-500">
          *Visible solo cuando la URL incluye <code>?setup=1</code>
        </span>
      </div>
    </div>
  );
}
