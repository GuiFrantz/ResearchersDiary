import { TEXT } from "./constants";

const API_BASE = "";

// Token helpers
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("rd_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("rd_token", token);
  else localStorage.removeItem("rd_token");
}

// API
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : TEXT.common.genericFail;
}

async function request(method: string, path: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      message = JSON.parse(text).detail || text;
    } catch { /* use raw text */ }
    throw new ApiError(res.status, message);
  }

  return res;
}

export async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await request(method, path, body);
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function apiBlob(method: string, path: string, body?: unknown): Promise<Blob> {
  return (await request(method, path, body)).blob();
}
