import type { Expense, ExpenseInput } from "../types";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
export type UserRole = "admin" | "employee";
export type Account = { email: string; name: string; role: UserRole };
const token = () =>
  localStorage.getItem("desflyer-remembered-token") ??
  localStorage.getItem("desflyer-session-token") ??
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
  return body as { token: string; user: Account };
}

export async function getCurrentUser(authToken: string) {
  const response = await fetch(`${apiBase}/api/auth/me`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? "Could not load account.");
  return body as { user: Account };
}

export const accountService = {
  getAll: () => request<Account[]>("/auth/users"),
  createEmployee: (values: { name: string; email: string; password: string }) =>
    request<Account>("/auth/users", { method: "POST", body: JSON.stringify(values) }),
  updateAdminPassword: (password: string) =>
    request<Account>("/auth/password", { method: "PATCH", body: JSON.stringify({ password }) }),
  updateEmployee: (email: string, values: { name: string; email: string; password?: string }) =>
    request<Account>(`/auth/users/${encodeURIComponent(email)}`, { method: "PATCH", body: JSON.stringify(values) }),
  deleteEmployee: (email: string) =>
    request<void>(`/auth/users/${encodeURIComponent(email)}`, { method: "DELETE" }),
};

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
