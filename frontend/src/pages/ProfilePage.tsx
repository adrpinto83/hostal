import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, UserRound } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();

  const brandName =
    localStorage.getItem("brand.name") ||
    (import.meta.env.VITE_BRAND_NAME as string) ||
    "Sistema Hostales";

  return (
    <section className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Perfil
        </h1>
        <p className="text-sm text-slate-500">
          Información de tu cuenta en {brandName}.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[220px,1fr]">
        {/* Tarjeta avatar */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200">
            <UserRound size={32} />
          </div>
          <div className="mt-4 text-center">
            <div className="text-sm font-medium text-slate-900">
              {user?.email || "Usuario"}
            </div>
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100">
              <ShieldCheck size={12} />
              <span>{(user?.role || "").toUpperCase() || "ROL"}</span>
            </div>
          </div>
        </div>

        {/* Detalle */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <dl className="divide-y divide-slate-100">
            <div className="grid grid-cols-3 gap-4 py-3">
              <dt className="text-sm text-slate-500">ID</dt>
              <dd className="col-span-2 truncate text-sm font-medium text-slate-900">
                {user?.id ?? "-"}
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-4 py-3">
              <dt className="text-sm text-slate-500">Email</dt>
              <dd className="col-span-2 truncate text-sm font-medium text-slate-900">
                {user?.email ?? "-"}
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-4 py-3">
              <dt className="text-sm text-slate-500">Rol</dt>
              <dd className="col-span-2 text-sm font-medium text-slate-900">
                {user?.role ?? "-"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
