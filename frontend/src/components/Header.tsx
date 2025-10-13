import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-gray-800">
          <div className="h-7 w-7 rounded bg-gray-900" />
          <span>Sistema Hostales</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Hola {user?.email}</span>
          <Link
            to="/profile"
            className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
          >
            Perfil
          </Link>
          <button
            onClick={logout}
            className="rounded bg-gray-900 px-3 py-1 text-sm text-white hover:bg-black"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
