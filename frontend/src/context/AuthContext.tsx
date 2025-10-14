import { createContext, useContext, useEffect, useState } from "react";
import http from "@/api/http";

type User = {
  id: number;
  email: string;
  role: string;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (token: string, opts?: { remember?: boolean }) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar sesión desde storage al inicio
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const cached = localStorage.getItem("auth_user");
    if (!token) {
      setLoading(false);
      return;
    }
    // opcional: hidratar con cache para evitar "parpadeo"
    if (cached) {
      try {
        setUser(JSON.parse(cached));
      } catch {}
    }
    // Validar token contra /users/me
    http
      .get("/users/me")
      .then((res) => {
        setUser(res.data);
        localStorage.setItem("auth_user", JSON.stringify(res.data));
      })
      .catch(() => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (token: string, opts?: { remember?: boolean }) => {
    // Guarda token
    localStorage.setItem("auth_token", token);
    // Carga el perfil con el token
    const { data } = await http.get<User>("/users/me");
    setUser(data);
    localStorage.setItem("auth_user", JSON.stringify(data));
    // Opcional: si no quieres persistir, podrías usar sessionStorage según opts?.remember
    // (te lo dejo simple para no complicar el flujo)
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
