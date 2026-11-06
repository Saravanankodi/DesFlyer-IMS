import type { Expense, ExpenseAttachment } from "../types";

export function fileToExpenseAttachment(file: File): Promise<ExpenseAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () => {
      resolve({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: String(reader.result),
      });
    };
    reader.readAsDataURL(file);
  });
}

export function getExpenseAttachments(expense: Expense): ExpenseAttachment[] {
  if (expense.receiptAttachments?.length) return expense.receiptAttachments;
  if (!expense.receiptDataUrl) return [];
  const type = expense.receiptDataUrl.match(/^data:([^;,]+)/)?.[1] ?? "application/octet-stream";
  return [{
    id: `legacy-${expense.id}`,
    name: expense.receiptFileName || "Receipt",
    type,
    size: Math.floor((expense.receiptDataUrl.length * 3) / 4),
    dataUrl: expense.receiptDataUrl,
  }];
}
