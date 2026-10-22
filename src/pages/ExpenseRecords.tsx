import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, Download, Printer, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { downloadExpensesCsv, formatRupees } from "../data/expenses";
import { useExpenses } from "../store";
import {
  ExpenseTable,
  PageHeading,
  SearchField,
  useGlobalExpenseSearch,
} from "../components/Shared";
import type { Expense } from "../types";

const pageSize = 10;
const anyPayee = "All payees";
const anyPurpose = "All purposes";

export function ExpenseRecords() {
  const { expenses } = useExpenses();
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
          (paidFor === anyPayee || item.paidFor === paidFor) &&
          (purpose === anyPurpose || item.purpose === purpose) &&
          (!fromDate || item.date >= fromDate) &&
          (!toDate || item.date <= toDate) &&
          (!minAmount || item.amount >= Number(minAmount)) &&
          (!maxAmount || item.amount <= Number(maxAmount))
        );
      }),
    [expenses, search, paidFor, purpose, fromDate, toDate, minAmount, maxAmount],
  );
  const sorted = [...matching].sort((a, b) => b.date.localeCompare(a.date));
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const visible = sorted.slice((page - 1) * pageSize, page * pageSize);
  const total = matching.reduce((sum, expense) => sum + expense.amount, 0);
  const openExpense = (expense: Expense) =>
    navigate(`/expenses/${expense.id}`);
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
        action={<label className="records-month-picker"><CalendarDays size={18} /><span>July 2026</span><input type="month" aria-label="Select records month" defaultValue="2026-07" /></label>}
      />
      <section className="records-filter-panel">
        <SearchField
          value={search}
          onChange={updateSearch}
          placeholder="Search by name, purpose, or expense..."
        />
        <div className="records-filter-row">
          <label className="records-select">
            <span className="sr-only">Filter by person or client</span>
            <select value={paidFor} onChange={(event) => { setPaidFor(event.target.value); setPage(1); }}>
              <option>{anyPayee}</option>
              {payees.map((name) => <option key={name}>{name}</option>)}
            </select>
            <ChevronDown size={16} />
          </label>
          <label className="records-select">
            <span className="sr-only">Filter by purpose</span>
            <select value={purpose} onChange={(event) => { setPurpose(event.target.value); setPage(1); }}>
              <option>{anyPurpose}</option>
              {purposes.map((name) => <option key={name}>{name}</option>)}
            </select>
            <ChevronDown size={16} />
          </label>
          <div className="records-date-range">
            <CalendarDays size={16} />
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
        <span>Showing {matching.length} expenses <i>·</i> Total Expense: {formatRupees(total)}</span>
        <div className="records-tools">
          <button type="button" aria-label="Download filtered expenses" onClick={() => downloadExpensesCsv(matching)}><Download size={18} /></button>
          <button type="button" aria-label="Print expense records" onClick={() => window.print()}><Printer size={18} /></button>
        </div>
      </div>
      <section className="panel records-panel">
        <ExpenseTable expenses={visible} onView={openExpense} />
        <div className="records-pagination">
          <span>Showing {sorted.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, sorted.length)} of {sorted.length} expenses</span>
          <div className="records-page-buttons">
            <button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button>
            {Array.from({ length: Math.min(pages, 5) }, (_, index) => {
              const pageNumber = pages <= 5 ? index + 1 : Math.max(1, Math.min(page - 2, pages - 4)) + index;
              return <button type="button" key={pageNumber} className={page === pageNumber ? "active" : ""} onClick={() => setPage(pageNumber)}>{pageNumber}</button>;
            })}
            <button type="button" aria-label="Next page" disabled={page === pages} onClick={() => setPage(page + 1)}>›</button>
          </div>
        </div>
      </section>
    </>
  );
}
