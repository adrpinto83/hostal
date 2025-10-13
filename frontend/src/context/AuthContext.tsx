import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getUserFromToken, JwtUser } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

type AuthState = {
  token: string | null;
  user: JwtUser | null;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<JwtUser | null>(() => {
    const t = localStorage.getItem("token");
    return t ? getUserFromToken(t) : null;
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      setUser(getUserFromToken(token));
    } else {
      localStorage.removeItem("token");
      setUser(null);
    }
  }, [token]);

  const login = (t: string) => {
    setToken(t);
    navigate("/dashboard");
  };

  const logout = () => {
    setToken(null);
    navigate("/login");
  };

  const value = useMemo(() => ({ token, user, login, logout }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
