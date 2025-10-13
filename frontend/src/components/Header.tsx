import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="w-full border-b bg-white">
      <div className="mx-auto max-w-6xl flex items-center justify-between p-4">
        <Link to="/dashboard" className="text-xl font-semibold">Sistema Hostales</Link>

        <nav className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            Hola {user?.id ? `#${user.id}` : ""} · {user?.role ?? " invitado"}
          </span>

          <Link
            to="/profile"
            className="rounded-xl px-3 py-2 text-sm border hover:bg-gray-50"
          >
            Perfil
          </Link>

          <button
            onClick={logout}
            className="rounded-xl px-3 py-2 text-sm text-white bg-gray-800 hover:bg-gray-700"
          >
            Cerrar sesión
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
