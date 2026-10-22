import type { Expense } from "../types";

// The app starts with no expense records. New entries are added by the user.
export const startingExpenses: Expense[] = [];

const demoAmounts = [
  15500, 8500, 7200, 5359, 3957, 3463, 3133, 2886, 2638, 2473, 2308,
  2061, 1896, 1814, 1649, 1566, 1484, 1402, 1319, 1237, 1154, 1072, 989,
  907, 824, 783, 742, 701, 660, 618, 577, 536, 495, 453, 412, 371, 330,
  289, 247, 206, 165, 124,
];
const demoClients = ["ABC Technologies", "XYZ Solutions", "Northstar Labs", "Bluebird Media", "Cedar Works", "Orbit Finance", "Brightside Retail", "Maple Digital"];
const demoEmployees = ["Arjun Kumar", "Priya Sharma", "Rohan Mehta", "Neha Sharma", "Dev Patel", "Kavya Rao"];
const demoVendors = [
  "ABC Technologies", "Metro Cab", "Office Depot", "Cloud Services",
  "Indigo Airlines", "Cafe Coffee Day", "Hotel Meridian", "Amazon Business",
  "City Cabs", "Workspace Central", "Freshworks", "The Fern Hotel",
  "Railway Catering", "Print House", "Adobe", "Uber India",
];
const demoCategories = [
  "Hardware", "Petrol / Travel", "Food / Meeting", "Internet / Sub",
  "Software / Cloud", "Other",
];
const demoPurposes = [
  "Hardware Procurement", "Petrol / Travel Allowance", "Client Meeting Food",
  "Internet Subscription", "Software / Cloud Renewal", "Office Operations",
  "Client project kickoff", "Airport transfer", "Team lunch",
  "Design software subscription", "Office supplies", "Customer workshop",
];

export function createDemoExpenses(): Expense[] {
  const year = 2026;
  const month = "07";

  return demoAmounts.map((amount, index) => {
    const slot = index % 6;
    const cycle = Math.floor(index / 6);
    const entity = slot === 0 || slot === 2
      ? { name: demoClients[(cycle * 2 + (slot === 2 ? 1 : 0)) % demoClients.length], type: "Client" as const }
      : slot === 1 || slot === 3
        ? { name: demoEmployees[(cycle * 2 + (slot === 3 ? 1 : 0)) % demoEmployees.length], type: "Employee" as const }
        : slot === 4
          ? { name: "Desflyer Office", type: "Company / Office" as const }
          : { name: "Other Operations", type: "Other" as const };
    const day = String((index % 25) + 1).padStart(2, "0");
    const receipt = index % 5 !== 0;
    return {
      id: `DEMO-${String(index + 1).padStart(3, "0")}`,
      date: `${year}-${month}-${day}`,
      vendor: demoVendors[index % demoVendors.length],
      category: demoCategories[index % demoCategories.length],
      amount,
      purpose: demoPurposes[index % demoPurposes.length],
      paidFor: entity.name,
      paidForType: entity.type,
      status: receipt ? (index % 4 === 0 ? "Pending" : "Verified") : "Needs receipt",
      receipt,
    };
  });
}

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
