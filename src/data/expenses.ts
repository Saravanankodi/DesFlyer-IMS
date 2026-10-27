import type { Expense } from "../types";

// The app starts with no expense records. New entries are added by the user.
export const startingExpenses: Expense[] = [];

export const formatRupees = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

export const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export function downloadExpensesCsv(expenses: Expense[]) {
  const rows = [
    ["Date", "Vendor", "Category", "Purpose", "Amount", "Status"],
    ...expenses.map((expense) => [
      expense.date,
      expense.vendor,
      expense.category,
      expense.purpose,
      String(expense.amount),
      expense.status,
    ]),
  ];
  const csv = rows
    .map((row) =>
      row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "desflyer-expenses.csv";
  link.click();
  URL.revokeObjectURL(url);
}
