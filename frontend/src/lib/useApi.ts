// src/lib/useApi.ts
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "./api";

export function useApi() {
  const { token, logout } = useAuth();
  const getToken = () => token;

  return {
    get: <T>(p: string) => apiFetch<T>(p, { method: "GET" }, getToken),
    post: <T>(p: string, body?: any) =>
      apiFetch<T>(p, { method: "POST", body: JSON.stringify(body) }, getToken),
    put: <T>(p: string, body?: any) =>
      apiFetch<T>(p, { method: "PUT", body: JSON.stringify(body) }, getToken),
    del: <T>(p: string) => apiFetch<T>(p, { method: "DELETE" }, getToken),
    onUnauthorized: () => logout(),
  };
}
