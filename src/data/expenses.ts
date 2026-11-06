import type { Expense } from "../types";
import { jsPDF } from "jspdf";

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
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadExpensesPdf(expenses: Expense[]) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const tableWidth = pageWidth - margin * 2;
  const columnWidths = [32, 54, 68, 38, 40, 41];
  const headers = ["DATE", "PAID FOR", "PURPOSE", "AMOUNT", "RECEIPT", "STATUS"];
  let y = 0;

  const drawTableHeader = (top: number) => {
    pdf.setFillColor(239, 242, 252);
    pdf.setDrawColor(220, 226, 237);
    pdf.rect(margin, top, tableWidth, 11, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(25, 36, 58);
    let x = margin;
    headers.forEach((header, index) => {
      pdf.text(header, x + 3, top + 7);
      x += columnWidths[index];
      if (index < headers.length - 1) pdf.line(x, top, x, top + 11);
    });
    return top + 11;
  };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(18, 27, 46);
  pdf.text("Expense Records", margin, 18);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(86, 94, 116);
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  pdf.text(`${expenses.length} expenses  |  Total: ${formatRupees(total).replace("₹", "INR ")}`, margin, 25);
  y = drawTableHeader(31);

  expenses.forEach((expense, rowIndex) => {
    const amount = formatRupees(expense.amount).replace("₹", "INR ");
    const values = [
      formatDate(expense.date),
      `${expense.paidFor}\n${expense.paidForType}`,
      `${expense.purpose || "—"}\n${expense.category}`,
      amount,
      expense.receipt ? "Attached" : "Not Added",
      expense.status,
    ];
    const wrapped = values.map((value, index) => pdf.splitTextToSize(value, columnWidths[index] - 6) as string[])
      .map((lines) => lines.length > 32 ? [...lines.slice(0, 31), "..."] : lines);
    const rowHeight = Math.max(12, ...wrapped.map((lines) => lines.length * 4.2 + 5));
    if (y + rowHeight > pageHeight - 13) {
      pdf.addPage("a4", "landscape");
      y = drawTableHeader(14);
    }

    pdf.setFillColor(rowIndex % 2 ? 248 : 255, rowIndex % 2 ? 250 : 255, rowIndex % 2 ? 253 : 255);
    pdf.setDrawColor(225, 230, 239);
    pdf.rect(margin, y, tableWidth, rowHeight, "FD");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(37, 43, 54);
    let x = margin;
    wrapped.forEach((lines, index) => {
      pdf.text(lines, x + 3, y + 4.5);
      x += columnWidths[index];
      if (index < wrapped.length - 1) pdf.line(x, y, x, y + rowHeight);
    });
    y += rowHeight;
  });

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(120, 128, 144);
    pdf.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 5, { align: "right" });
  }
  pdf.save("expense-records.pdf");
}

export function downloadMonthlyExpenseReportPdf(expenses: Expense[]) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const tableWidth = pageWidth - margin * 2;
  const columnWidths = [32, 54, 68, 38, 40, 41];
  const headers = ["DATE", "PAID FOR", "PURPOSE", "AMOUNT", "RECEIPT", "STATUS"];
  const grouped = new Map<string, Expense[]>();
  expenses.forEach((expense) => {
    const month = expense.date.slice(0, 7);
    grouped.set(month, [...(grouped.get(month) ?? []), expense]);
  });
  const monthKeys = [...grouped.keys()].sort((a, b) => b.localeCompare(a));
  let pageNumber = 0;

  const drawTableHeader = (top: number) => {
    pdf.setFillColor(239, 242, 252);
    pdf.setDrawColor(220, 226, 237);
    pdf.rect(margin, top, tableWidth, 11, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(25, 36, 58);
    let x = margin;
    headers.forEach((header, index) => {
      pdf.text(header, x + 3, top + 7);
      x += columnWidths[index];
      if (index < headers.length - 1) pdf.line(x, top, x, top + 11);
    });
    return top + 11;
  };

  const startMonthPage = (month: string, monthExpenses: Expense[], continued = false) => {
    if (pageNumber > 0) pdf.addPage("a4", "landscape");
    pageNumber += 1;
    const label = month
      ? new Date(`${month}-01T00:00:00`).toLocaleDateString("en", { month: "long", year: "numeric" })
      : "No expense records";
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(18, 27, 46);
    pdf.text(`Expense Report — ${label}${continued ? " (continued)" : ""}`, margin, 18);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(86, 94, 116);
    const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    pdf.text(`${monthExpenses.length} expenses  |  Monthly total: ${formatRupees(monthTotal).replace("₹", "INR ")}`, margin, 25);
    return drawTableHeader(31);
  };

  const drawExpenseRow = (expense: Expense, rowIndex: number, top: number) => {
    const values = [
      formatDate(expense.date),
      `${expense.paidFor}\n${expense.paidForType}`,
      `${expense.purpose || "—"}\n${expense.category}`,
      formatRupees(expense.amount).replace("₹", "INR "),
      expense.receipt ? "Attached" : "Not Added",
      expense.status,
    ];
    const wrapped = values.map((value, index) => pdf.splitTextToSize(value, columnWidths[index] - 6) as string[])
      .map((lines) => lines.length > 32 ? [...lines.slice(0, 31), "..."] : lines);
    const rowHeight = Math.max(12, ...wrapped.map((lines) => lines.length * 4.2 + 5));
    if (top + rowHeight > pageHeight - 13) return null;

    pdf.setFillColor(rowIndex % 2 ? 248 : 255, rowIndex % 2 ? 250 : 255, rowIndex % 2 ? 253 : 255);
    pdf.setDrawColor(225, 230, 239);
    pdf.rect(margin, top, tableWidth, rowHeight, "FD");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(37, 43, 54);
    let x = margin;
    wrapped.forEach((lines, index) => {
      pdf.text(lines, x + 3, top + 4.5);
      x += columnWidths[index];
      if (index < wrapped.length - 1) pdf.line(x, top, x, top + rowHeight);
    });
    return top + rowHeight;
  };

  for (const month of monthKeys.length ? monthKeys : [""]) {
    const monthExpenses = (grouped.get(month) ?? []).sort((a, b) => b.date.localeCompare(a.date));
    let y = startMonthPage(month, monthExpenses);
    for (let index = 0; index < monthExpenses.length; index += 1) {
      const nextY = drawExpenseRow(monthExpenses[index], index, y);
      if (nextY === null) {
        y = startMonthPage(month, monthExpenses, true);
        index -= 1;
        continue;
      }
      y = nextY;
    }
    if (!monthExpenses.length) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(86, 94, 116);
      pdf.text("No expenses to report.", margin + 3, y + 10);
    }
  }

  for (let page = 1; page <= pdf.getNumberOfPages(); page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(120, 128, 144);
    pdf.text(`Page ${page} of ${pdf.getNumberOfPages()}`, pageWidth - margin, pageHeight - 5, { align: "right" });
  }
  pdf.save("desflyer-monthly-expense-report.pdf");
}
