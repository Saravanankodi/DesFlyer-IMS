import { startingExpenses } from "../data/expenses";
import type { Expense, ExpenseInput } from "../types";

// UI pages use this service instead of reading demo data directly.
// Replace these functions with API requests when the storage service is ready.
let expenses = [...startingExpenses];

export const expenseService = {
  getAll: () => expenses,
  getById: (id: string) => expenses.find((expense) => expense.id === id),
  add: (input: ExpenseInput): Expense => {
    const expense: Expense = {
      ...input,
      id: `EXP-2026-${String(Date.now()).slice(-4)}`,
      status: "Pending",
      receipt: input.receipt ?? false,
    };
    expenses = [expense, ...expenses];
    return expense;
  },
  update: (id: string, updates: Partial<Expense>) => {
    expenses = expenses.map((expense) =>
      expense.id === id ? { ...expense, ...updates } : expense,
    );
  },
  remove: (id: string) => {
    expenses = expenses.filter((expense) => expense.id !== id);
  },
};
