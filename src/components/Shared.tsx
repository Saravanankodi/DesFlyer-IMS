import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Download,
  Eye,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  downloadExpensesCsv,
  formatDate,
  formatRupees,
} from "../data/expenses";
import { useExpenses } from "../store";
import type { Expense, ExpenseStatus } from "../types";

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: ExpenseStatus }) {
  const className =
    status === "Verified"
      ? "status-good"
      : status === "Pending"
        ? "status-pending"
        : "status-missing";
  return (
    <span className={`status-badge ${className}`}>
      <i />
      {status}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  note,
  tone = "blue",
}: {
  label: string;
  value: string;
  note: string;
  tone?: string;
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}>
        {tone === "green" ? "↗" : tone === "orange" ? "▤" : "₹"}
      </div>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

export function ExpenseTable({
  expenses,
  onView,
}: {
  expenses: Expense[];
  onView: (expense: Expense) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>DATE</th>
            <th>PAID FOR</th>
            <th>PURPOSE</th>
            <th>AMOUNT</th>
            <th>RECEIPT</th>
            <th>STATUS</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id}>
              <td>{formatDate(expense.date)}</td>
              <td>
                <strong>{expense.paidFor}</strong>
                <small className="table-subtext">{expense.paidForType}</small>
              </td>
              <td>
                <span>{expense.purpose}</span>
                <small className="table-subtext">{expense.category}</small>
              </td>
              <td className="amount-cell">{formatRupees(expense.amount)}</td>
              <td>
                <span
                  className={
                    expense.receipt ? "receipt-attached" : "receipt-missing"
                  }
                >
                  {expense.receipt ? "Attached" : "Not Added"}
                </span>
              </td>
              <td>
                <StatusBadge status={expense.status} />
              </td>
              <td>
                <button className="text-button" onClick={() => onView(expense)}>
                  <Eye size={15} />
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {expenses.length === 0 && (
        <div className="empty-state">
          <Search size={22} />
          <strong>No matching expenses</strong>
          <span>Try another search or change your filters.</span>
        </div>
      )}
    </div>
  );
}

export function ExportButton({
  children = "Export report",
}: {
  children?: ReactNode;
}) {
  const { expenses } = useExpenses();
  return (
    <button
      className="button button-outline"
      onClick={() => downloadExpensesCsv(expenses)}
    >
      <Download size={15} />
      {children}
    </button>
  );
}

export function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="filter-select">
      <span className="sr-only">{label}</span>
      <SlidersHorizontal size={15} />
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <ChevronDown size={14} />
    </label>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder = "Search expenses...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-field">
      <Search size={16} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export function TableControls({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="table-controls">
      <span>
        Showing page {page} of {pages}
      </span>
      <div>
        <button
          className="button button-outline button-small"
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
        >
          <ArrowUp size={14} />
          Previous
        </button>
        <button
          className="button button-outline button-small"
          disabled={page === pages}
          onClick={() => onPage(page + 1)}
        >
          Next
          <ArrowDown size={14} />
        </button>
      </div>
    </div>
  );
}

export function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timeout);
  }, [message, onClose]);
  return (
    <div role="status" className="toast">
      <span className="toast-check">✓</span>
      {message}
      <button onClick={onClose} aria-label="Close notification">
        ×
      </button>
    </div>
  );
}

export function useToast() {
  const [message, setMessage] = useState("");
  const showToast = (nextMessage: string) => setMessage(nextMessage);
  const toast = message ? (
    <Toast message={message} onClose={() => setMessage("")} />
  ) : null;
  return { showToast, toast };
}

export function useGlobalExpenseSearch(initialSearch = "") {
  const [search, setSearch] = useState(initialSearch);
  useEffect(() => {
    const updateSearch = (event: Event) =>
      setSearch((event as CustomEvent<string>).detail);
    window.addEventListener("expense-search", updateSearch);
    return () => window.removeEventListener("expense-search", updateSearch);
  }, []);
  return search;
}
