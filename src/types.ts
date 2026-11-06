export type ExpenseStatus = "Verified" | "Pending" | "Needs receipt";
export type PaidForType = "Client" | "Employee" | "Company / Office" | "Other";
export type ExpenseAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};
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
  submittedAt?: string;
  approvedAt?: string;
  createdByRole?: "admin" | "employee";
  createdByName?: string;
  createdByEmail?: string;
  receiptAttachments?: ExpenseAttachment[];
  receiptFileName?: string;
  receiptDataUrl?: string;
};

export type ExpenseInput = Omit<Expense, "id" | "status" | "receipt"> & {
  receipt?: boolean;
};
