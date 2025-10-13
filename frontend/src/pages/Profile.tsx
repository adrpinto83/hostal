import React from "react";
import { useAuth } from "@/context/AuthContext";

const Profile: React.FC = () => {
  const { user, token } = useAuth();

  // Si más adelante agregas /api/v1/users/me, aquí puedes hacer fetch para email, nombre, etc.
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Mi perfil</h1>

      <div className="grid gap-4">
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">ID de usuario</div>
          <div className="text-base">{user?.id ?? "-"}</div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Rol</div>
          <div className="text-base capitalize">{user?.role ?? "-"}</div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Token (parcial)</div>
          <div className="text-xs break-all">
            {token ? `${token.slice(0, 16)}…${token.slice(-10)}` : "-"}
          </div>
        </div>

        {/* Placeholder para “Cambiar contraseña” */}
        <div className="rounded-2xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Seguridad</div>
              <div className="text-base">Cambiar contraseña</div>
            </div>
            <button
              className="rounded-xl px-3 py-2 text-sm border hover:bg-gray-50"
              onClick={() => alert("Pendiente implementar endpoint de cambio de contraseña")}
            >
              Cambiar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
