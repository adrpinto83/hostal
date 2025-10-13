export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(body?.detail ?? `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  getToken?: () => string | null
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");

  const token = getToken?.();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const contentType = res.headers.get("Content-Type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}
