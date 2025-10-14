import { useMemo } from "react";
import { CalendarClock, Users, BedDouble, ClipboardList } from "lucide-react";

export default function DashboardPage() {
  const brandName =
    localStorage.getItem("brand.name") ||
    (import.meta.env.VITE_BRAND_NAME as string) ||
    "Sistema Hostales";

  // Datos mockeados por ahora; luego los podemos traer del backend
  const stats = useMemo(
    () => [
      { icon: BedDouble, label: "Habitaciones", value: 18, sub: "12 ocupadas" },
      { icon: Users, label: "Huéspedes", value: 42, sub: "7 check-ins hoy" },
      { icon: ClipboardList, label: "Reservas", value: 26, sub: "5 pendientes" },
      { icon: CalendarClock, label: "Próximas salidas", value: 9, sub: "en 48 horas" },
    ],
    []
  );

  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Panel de control
        </h1>
        <p className="text-sm text-slate-500">
          Bienvenido a {brandName}. Aquí tienes un resumen general.
        </p>
      </header>

      {/* Tarjetas de KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <article
            key={i}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <s.icon size={18} />
              </div>
              <div className="text-sm font-medium text-slate-500">{s.label}</div>
            </div>
            <div className="text-2xl font-semibold text-slate-900">{s.value}</div>
            <div className="mt-1 text-xs text-slate-500">{s.sub}</div>
          </article>
        ))}
      </div>

      {/* Acciones rápidas */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <a
          href="/rooms"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
        >
          <div className="text-sm font-semibold text-slate-900">Habitaciones</div>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona disponibilidad y tarifas.
          </p>
        </a>
        <a
          href="/reservations"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
        >
          <div className="text-sm font-semibold text-slate-900">Reservas</div>
          <p className="mt-1 text-sm text-slate-500">
            Crea, confirma o cancela reservas.
          </p>
        </a>
        <a
          href="/guests"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
        >
          <div className="text-sm font-semibold text-slate-900">Huéspedes</div>
          <p className="mt-1 text-sm text-slate-500">
            Registra check-ins y edita datos.
          </p>
        </a>
      </div>
    </section>
  );
}
