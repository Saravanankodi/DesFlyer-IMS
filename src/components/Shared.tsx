import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Download,
  Link2Off,
  MoreVertical,
  Paperclip,
  Pencil,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  downloadExpensesCsv,
  formatDate,
  formatRupees,
} from "../data/expenses";
import { useExpenses } from "../store";
import { useAuth } from "../auth";
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

export function FilterDropdown({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const id = useId();
  const filterRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mobileMenuPosition, setMobileMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const [query, setQuery] = useState("");
  const filteredOptions = options.filter((option) => option.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setMobileMenuPosition(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setMobileMenuPosition(null);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className={`filter-dropdown ${className}`} ref={filterRef}>
      <button
        type="button"
        className="filter-dropdown-trigger"
        role="combobox"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        onClick={(event) => {
          setQuery("");
          if (open) {
            setOpen(false);
            setMobileMenuPosition(null);
            return;
          }
          if (window.matchMedia("(max-width: 760px)").matches) {
            const bounds = event.currentTarget.getBoundingClientRect();
            const width = Math.min(320, window.innerWidth - 32);
            const height = Math.min(420, window.innerHeight - 32);
            const left = Math.max(16, Math.min(bounds.left, window.innerWidth - width - 16));
            const below = bounds.bottom + 6;
            const top = below + height <= window.innerHeight - 16
              ? below
              : Math.max(16, bounds.top - height - 6);
            setMobileMenuPosition({ left, top });
          } else {
            setMobileMenuPosition(null);
          }
          setOpen(true);
        }}
      >
        <span>{value}</span><ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div
          className={`filter-dropdown-menu${mobileMenuPosition ? " mobile-filter-dropdown-menu" : ""}`}
          id={`${id}-menu`}
          style={mobileMenuPosition ?? undefined}
          role="dialog"
          aria-label={`${label} options`}
        >
          <label className="filter-dropdown-search">
            <Search size={15} aria-hidden="true" />
            <input type="search" aria-label={`Search ${label}`} placeholder={`Search ${label.toLowerCase()}…`} value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="filter-dropdown-options" role="listbox" aria-label={`${label} options`}>
            {filteredOptions.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={value === option}
                className={value === option ? "selected" : ""}
                key={option}
                onClick={() => { onChange(option); setOpen(false); setMobileMenuPosition(null); setQuery(""); }}
              >
                <span>{option}</span>{value === option && <span className="filter-dropdown-check" aria-hidden="true">✓</span>}
              </button>
            ))}
            {!filteredOptions.length && <p className="filter-dropdown-empty">No matching options.</p>}
          </div>
        </div>
      )}
    </div>
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
  onEdit,
  onDelete,
}: {
  expenses: Expense[];
  onView: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const { isAdmin } = useAuth();
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
                  {expense.receipt ? <Paperclip size={13} /> : <Link2Off size={13} />}
                  {expense.receipt ? "Attached" : "Not Added"}
                </span>
              </td>
              <td>
                <StatusBadge status={expense.status} />
              </td>
              <td>
                <div className="records-action-group">
                  <button className="text-button" onClick={() => onView(expense)}>
                    View
                  </button>
                  <div className="records-action-menu-wrap">
                    <button
                      className="records-more-button"
                      type="button"
                      aria-label={`Actions for ${expense.paidFor}`}
                      aria-haspopup="menu"
                      aria-expanded={openMenuId === expense.id}
                      onClick={() => setOpenMenuId((current) => current === expense.id ? null : expense.id)}
                    >
                      <MoreVertical size={18} />
                    </button>
                    {openMenuId === expense.id && (
                      <div className="records-row-menu" role="menu">
                        <button type="button" role="menuitem" onClick={() => { setOpenMenuId(null); onEdit(expense); }}><Pencil size={14} /> Edit</button>
                        {isAdmin && <button type="button" role="menuitem" onClick={() => { setOpenMenuId(null); onDelete(expense); }}><Trash2 size={14} /> Delete</button>}
                      </div>
                    )}
                  </div>
                </div>
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
