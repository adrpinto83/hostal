export type JwtUser = {
  id: string;
  role: string;
  // opcional si más tarde agregas email al token
  email?: string;
};

export function decodeJwt<T = unknown>(token: string): T | null {
  try {
    const base64 = token.split(".")[1];
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function getUserFromToken(token: string): JwtUser | null {
  const payload = decodeJwt<Record<string, unknown>>(token);
  if (!payload) return null;
  const id = String(payload.sub ?? "");
  const role = String(payload.role ?? "");
  return id && role ? { id, role } : null;
}
