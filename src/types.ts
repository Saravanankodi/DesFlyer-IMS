export type ExpenseStatus = "Verified" | "Pending" | "Needs receipt";
export type PaidForType = "Client" | "Employee" | "Company / Office" | "Other";
export type Expense = {
  id: string;
  date: string;
  vendor: string;
  category: string;
  amount: number;
  purpose: string;
  paidFor: string;
  paidForType: PaidForType;
  department?: string;
  paymentMethod?: string;
  status: ExpenseStatus;
  receipt: boolean;
};

export type ExpenseInput = Omit<Expense, "id" | "status" | "receipt"> & {
  receipt?: boolean;
};
