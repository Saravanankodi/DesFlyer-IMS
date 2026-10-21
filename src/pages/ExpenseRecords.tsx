import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { formatRupees } from "../data/expenses";
import { useExpenses } from "../store";
import {
  ExpenseTable,
  ExportButton,
  PageHeading,
  SearchField,
  SelectFilter,
  TableControls,
  useGlobalExpenseSearch,
} from "../components/Shared";
import type { ExpenseStatus } from "../types";

const pageSize = 6;

export function ExpenseRecords() {
  const { expenses } = useExpenses();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = useGlobalExpenseSearch(searchParams.get("search") ?? "");
  const [status, setStatus] = useState("All statuses");
  const [category, setCategory] = useState("All categories");
  const [sort, setSort] = useState("Newest first");
  const [page, setPage] = useState(1);
  const categories = [
    "All categories",
    ...new Set(expenses.map((item) => item.category)),
  ];
  const matching = useMemo(
    () =>
      expenses.filter((item) => {
        const matchesText =
          `${item.id} ${item.vendor} ${item.purpose} ${item.category} ${item.paidFor} ${item.paidForType}`
            .toLowerCase()
            .includes(search.toLowerCase());
        const matchesStatus =
          status === "All statuses" || item.status === status;
        const matchesCategory =
          category === "All categories" || item.category === category;
        return matchesText && matchesStatus && matchesCategory;
      }),
    [expenses, search, status, category],
  );
  const sorted = [...matching].sort((a, b) =>
    sort === "Highest amount"
      ? b.amount - a.amount
      : sort === "Lowest amount"
        ? a.amount - b.amount
        : sort === "Oldest first"
          ? a.date.localeCompare(b.date)
          : b.date.localeCompare(a.date),
  );
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const visible = sorted.slice((page - 1) * pageSize, page * pageSize);
  const openExpense = (expense: { id: string }) =>
    navigate(`/expenses/${expense.id}`);

  return (
    <>
      <PageHeading
        title="Expense Records"
        description="Review, search and manage company expenses."
        action={
          <div className="heading-actions">
            <ExportButton />
            <Link className="button button-primary" to="/expenses/new">
              <Plus size={16} />
              Add Expense
            </Link>
          </div>
        }
      />
      <div className="record-summary">
        <div>
          <span>JULY 2026 TOTAL</span>
          <strong>
            {formatRupees(
              expenses.reduce((total, item) => total + item.amount, 0),
            )}
          </strong>
        </div>
        <div>
          <span>EXPENSE ENTRIES</span>
          <strong>{expenses.length}</strong>
        </div>
        <div>
          <span>NEED YOUR ATTENTION</span>
          <strong>
            {expenses.filter((item) => item.status !== "Verified").length}
          </strong>
        </div>
      </div>
      <section className="panel records-panel">
        <div className="record-toolbar">
          <SearchField
            value={search}
            onChange={(value) => {
              window.dispatchEvent(
                new CustomEvent("expense-search", { detail: value }),
              );
              setSearchParams(value.trim() ? { search: value } : {}, {
                replace: true,
              });
              setPage(1);
            }}
          />
          <SelectFilter
            label="Filter by status"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={
              [
                "All statuses",
                "Verified",
                "Pending",
                "Needs receipt",
              ] as ExpenseStatus[]
            }
          />
          <SelectFilter
            label="Filter by category"
            value={category}
            onChange={(value) => {
              setCategory(value);
              setPage(1);
            }}
            options={categories}
          />
          <SelectFilter
            label="Sort expenses"
            value={sort}
            onChange={(value) => {
              setSort(value);
              setPage(1);
            }}
            options={[
              "Newest first",
              "Oldest first",
              "Highest amount",
              "Lowest amount",
            ]}
          />
        </div>
        <ExpenseTable expenses={visible} onView={openExpense} />
        <TableControls page={page} pages={pages} onPage={setPage} />
      </section>
    </>
  );
}
