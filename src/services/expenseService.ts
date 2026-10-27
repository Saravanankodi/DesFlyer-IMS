import type { Expense, ExpenseInput } from "../types";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
const token = () =>
  localStorage.getItem("desflyer-remembered-token") ??
  sessionStorage.getItem("desflyer-session-token");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function authenticate(email: string, password: string) {
  const response = await fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? "Login failed.");
  return body as { token: string; user: { email: string } };
}

export const expenseService = {
  getAll: () => request<Expense[]>("/expenses"),
  getById: (id: string) => request<Expense>(`/expenses/${encodeURIComponent(id)}`),
  replaceAll: (records: Expense[]) =>
    request<Expense[]>("/expenses", { method: "PUT", body: JSON.stringify(records) }),
  add: (input: ExpenseInput) =>
    request<Expense>("/expenses", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, updates: Partial<Expense>) =>
    request<Expense>(`/expenses/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),
  remove: (id: string) =>
    request<void>(`/expenses/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
