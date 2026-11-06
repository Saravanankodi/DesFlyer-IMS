import { useMemo, useState } from "react";
import { Download, Printer, Trash2, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { downloadExpensesPdf, formatRupees } from "../data/expenses";
import { useExpenses } from "../store";
import {
  ExpenseTable,
  FilterDropdown,
  PageHeading,
  SearchField,
  useGlobalExpenseSearch,
} from "../components/Shared";
import type { Expense } from "../types";
import { CalendarIcon, MonthPicker } from "../components/MonthPicker";
import { getCurrentMonthValue } from "../data/dates";

const pageSize = 10;
const anyPayee = "All payees";
const anyPurpose = "All purposes";

export function ExpenseRecords() {
  const { expenses, deleteExpense } = useExpenses();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = useGlobalExpenseSearch(searchParams.get("search") ?? "");
  const [paidFor, setPaidFor] = useState(anyPayee);
  const [purpose, setPurpose] = useState(anyPurpose);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const payees = [...new Set(expenses.map((item) => item.paidFor))].sort();
  const purposes = [...new Set(expenses.map((item) => item.purpose))].sort();

  const matching = useMemo(
    () =>
      expenses.filter((item) => {
        const matchesText =
          `${item.id} ${item.vendor} ${item.purpose} ${item.category} ${item.paidFor} ${item.paidForType}`
            .toLowerCase()
            .includes(search.toLowerCase());
        return (
          matchesText &&
          item.date.startsWith(selectedMonth) &&
          (paidFor === anyPayee || item.paidFor === paidFor) &&
          (purpose === anyPurpose || item.purpose === purpose) &&
          (!fromDate || item.date >= fromDate) &&
          (!toDate || item.date <= toDate) &&
          (!minAmount || item.amount >= Number(minAmount)) &&
          (!maxAmount || item.amount <= Number(maxAmount))
        );
      }),
    [expenses, search, selectedMonth, paidFor, purpose, fromDate, toDate, minAmount, maxAmount],
  );
  const sorted = [...matching].sort((a, b) => b.date.localeCompare(a.date));
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const mobilePageNumbers: (number | "ellipsis")[] = pages <= 4
    ? Array.from({ length: pages }, (_, index) => index + 1)
    : page <= 3
      ? [1, 2, 3, "ellipsis", pages]
      : [1, "ellipsis", page - 1, page, pages];
  const visible = sorted.slice((page - 1) * pageSize, page * pageSize);
  const total = matching.reduce((sum, expense) => sum + expense.amount, 0);
  const openExpense = (expense: Expense) =>
    navigate(`/expenses/${encodeURIComponent(expense.id)}`);
  const updateSearch = (value: string) => {
    window.dispatchEvent(new CustomEvent("expense-search", { detail: value }));
    setSearchParams(value.trim() ? { search: value } : {}, { replace: true });
    setPage(1);
  };
  const clearFilters = () => {
    window.dispatchEvent(new CustomEvent("expense-search", { detail: "" }));
    setSearchParams({}, { replace: true });
    setPaidFor(anyPayee);
    setPurpose(anyPurpose);
    setFromDate("");
    setToDate("");
    setMinAmount("");
    setMaxAmount("");
    setPage(1);
  };
  const activeFilters = [
    ...(paidFor !== anyPayee ? [{ label: `Paid for: ${paidFor}`, clear: () => setPaidFor(anyPayee) }] : []),
    ...(purpose !== anyPurpose ? [{ label: `Purpose: ${purpose}`, clear: () => setPurpose(anyPurpose) }] : []),
    ...(fromDate ? [{ label: `From: ${fromDate}`, clear: () => setFromDate("") }] : []),
    ...(toDate ? [{ label: `To: ${toDate}`, clear: () => setToDate("") }] : []),
    ...(minAmount ? [{ label: `Min: ${formatRupees(Number(minAmount))}`, clear: () => setMinAmount("") }] : []),
    ...(maxAmount ? [{ label: `Max: ${formatRupees(Number(maxAmount))}`, clear: () => setMaxAmount("") }] : []),
  ];

  return (
    <>
      <PageHeading
        title="Expense Records"
        description="Record a company expense and keep your monthly spending accurate."
        action={<MonthPicker className="records-month-picker" label="Select records month and year" value={selectedMonth} compactOnMobile onChange={(value) => { setSelectedMonth(value); setPage(1); }} />}
      />
      <section className="records-filter-panel">
        <SearchField
          value={search}
          onChange={updateSearch}
          placeholder="Search by name, purpose, or expense..."
        />
        <div className="records-filter-row">
          <FilterDropdown
            className="records-filter-dropdown"
            label="Paid for"
            value={paidFor}
            options={[anyPayee, ...payees]}
            onChange={(value) => { setPaidFor(value); setPage(1); }}
          />
          <FilterDropdown
            className="records-filter-dropdown"
            label="Purpose"
            value={purpose}
            options={[anyPurpose, ...purposes]}
            onChange={(value) => { setPurpose(value); setPage(1); }}
          />
          <div className="records-date-range">
            <CalendarIcon className="records-calendar-icon" />
            <input aria-label="From date" type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} />
            <span>to</span>
            <input aria-label="To date" type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1); }} />
          </div>
          <div className="records-amount-range">
            <b>₹</b>
            <input aria-label="Minimum amount" type="number" min="0" placeholder="Min" value={minAmount} onChange={(event) => { setMinAmount(event.target.value); setPage(1); }} />
            <span>–</span>
            <b>₹</b>
            <input aria-label="Maximum amount" type="number" min="0" placeholder="Max" value={maxAmount} onChange={(event) => { setMaxAmount(event.target.value); setPage(1); }} />
          </div>
          <button className="records-clear-button" type="button" onClick={clearFilters}>Clear filters</button>
        </div>
        <div className="records-active-filters" aria-live="polite">
          {activeFilters.map((filter) => (
            <button className="records-filter-chip" key={filter.label} onClick={filter.clear} type="button">
              {filter.label}<X size={12} />
            </button>
          ))}
        </div>
      </section>
      <div className="records-summary-bar">
        <span>Showing {matching.length} expenses <i>·</i> Total Expense: <strong className="records-total-amount">{formatRupees(total)}</strong></span>
        <div className="records-tools">
          <button type="button" aria-label="Download filtered expenses as PDF" onClick={() => downloadExpensesPdf(sorted)}><Download size={18} /></button>
          <button type="button" aria-label="Print expense records" onClick={() => window.print()}><Printer size={18} /></button>
        </div>
      </div>
      <section className="panel records-panel">
        <ExpenseTable
          expenses={visible}
          onView={openExpense}
          onEdit={(expense) => navigate(`/expenses/${encodeURIComponent(expense.id)}/edit`)}
          onDelete={setDeleteTarget}
        />
        <div className="records-pagination">
          <span>Showing {sorted.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, sorted.length)} of {sorted.length} expenses</span>
          <div className="records-page-buttons records-page-buttons-desktop">
            <button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button>
            {Array.from({ length: Math.min(pages, 5) }, (_, index) => {
              const pageNumber = pages <= 5 ? index + 1 : Math.max(1, Math.min(page - 2, pages - 4)) + index;
              return <button type="button" key={pageNumber} className={page === pageNumber ? "active" : ""} onClick={() => setPage(pageNumber)}>{pageNumber}</button>;
            })}
            <button type="button" aria-label="Next page" disabled={page === pages} onClick={() => setPage(page + 1)}>›</button>
          </div>
          <div className="records-page-buttons records-page-buttons-mobile" aria-label="Expense record pages">
            {mobilePageNumbers.map((pageNumber, index) => pageNumber === "ellipsis"
              ? <span className="records-page-ellipsis" key={`ellipsis-${index}`} aria-hidden="true">…</span>
              : <button type="button" key={pageNumber} className={page === pageNumber ? "active" : ""} aria-current={page === pageNumber ? "page" : undefined} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}
          </div>
        </div>
      </section>
      {deleteTarget && (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="records-delete-title">
            <span className="delete-icon"><Trash2 size={20} /></span>
            <h2 id="records-delete-title">Delete this expense?</h2>
            <p>This will remove <strong>{deleteTarget.id}</strong> from the expense records.</p>
            <div className="heading-actions">
              <button className="button button-outline" type="button" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="button button-danger" type="button" onClick={async () => {
                await deleteExpense(deleteTarget.id);
                setDeleteTarget(null);
                setPage((current) => Math.min(current, Math.max(1, Math.ceil((matching.length - 1) / pageSize))));
              }}>Delete expense</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
