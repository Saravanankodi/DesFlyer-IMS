import type { Expense } from "../types";

// Demo records are kept here so they are easy to replace with API data later.
export const startingExpenses: Expense[] = [
  {
    id: "EXP-2026-0042",
    date: "2026-07-28",
    vendor: "ABC Technologies",
    category: "Travel",
    amount: 8500,
    purpose: "Client visit travel and accommodation",
    paidFor: "ABC Technologies",
    paidForType: "Client",
    status: "Verified",
    receipt: true,
  },
  {
    id: "EXP-2026-0041",
    date: "2026-07-27",
    vendor: "Arjun Kumar",
    category: "Equipment",
    amount: 2500,
    purpose: "Laptop service",
    paidFor: "Arjun Kumar",
    paidForType: "Employee",
    status: "Pending",
    receipt: true,
  },
  {
    id: "EXP-2026-0040",
    date: "2026-07-25",
    vendor: "DesFlyer Office",
    category: "Utilities",
    amount: 3000,
    purpose: "Monthly internet connection",
    paidFor: "DesFlyer Office",
    paidForType: "Company / Office",
    status: "Needs receipt",
    receipt: false,
  },
  {
    id: "EXP-2026-0039",
    date: "2026-07-23",
    vendor: "XYZ Solutions",
    category: "Meals",
    amount: 4200,
    purpose: "Project planning meeting",
    paidFor: "XYZ Solutions",
    paidForType: "Client",
    status: "Verified",
    receipt: true,
  },
  {
    id: "EXP-2026-0038",
    date: "2026-07-21",
    vendor: "Priya Sharma",
    category: "Equipment",
    amount: 42000,
    purpose: "Laptop purchase",
    paidFor: "Priya Sharma",
    paidForType: "Employee",
    status: "Verified",
    receipt: true,
  },
  {
    id: "EXP-2026-0037",
    date: "2026-07-19",
    vendor: "Metro Fuel Station",
    category: "Travel",
    amount: 1200,
    purpose: "Local client visit petrol",
    paidFor: "Metro Fuel Station",
    paidForType: "Client",
    status: "Pending",
    receipt: true,
  },
  {
    id: "EXP-2026-0036",
    date: "2026-07-17",
    vendor: "Paper & Co.",
    category: "Office",
    amount: 1850,
    purpose: "Office stationery",
    paidFor: "DesFlyer Office",
    paidForType: "Company / Office",
    status: "Verified",
    receipt: true,
  },
  {
    id: "EXP-2026-0035",
    date: "2026-07-14",
    vendor: "Cloudbase",
    category: "Software",
    amount: 7200,
    purpose: "Monthly cloud services",
    paidFor: "DesFlyer Office",
    paidForType: "Company / Office",
    status: "Verified",
    receipt: true,
  },
  {
    id: "EXP-2026-0034",
    date: "2026-07-10",
    vendor: "Bright Hotel",
    category: "Travel",
    amount: 6500,
    purpose: "Regional team visit",
    paidFor: "Bright Hotel",
    paidForType: "Employee",
    status: "Pending",
    receipt: false,
  },
];

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
