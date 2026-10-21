import { useMemo, useState } from "react";
import { CalendarDays, Download, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatRupees } from "../data/expenses";
import { useExpenses } from "../store";
import { ExportButton, MetricCard, PageHeading } from "../components/Shared";

export function Analytics() {
  const { expenses } = useExpenses();
  const navigate = useNavigate();
  const [category, setCategory] = useState("All categories");
  const categories = [
    "All categories",
    ...new Set(expenses.map((expense) => expense.category)),
  ];
  const filtered = useMemo(
    () =>
      category === "All categories"
        ? expenses
        : expenses.filter((item) => item.category === category),
    [expenses, category],
  );
  const total = filtered.reduce((sum, item) => sum + item.amount, 0);
  const max = Math.max(...filtered.map((item) => item.amount), 1);
  const categoryTotals = categories
    .slice(1)
    .map((name) => ({
      name,
      amount: expenses
        .filter((item) => item.category === name)
        .reduce((sum, item) => sum + item.amount, 0),
    }))
    .sort((a, b) => b.amount - a.amount);
  const highExpenses = [...filtered]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return (
    <>
      <PageHeading
        title="Expense Analytics"
        description="Analyze company spending and financial performance across all departments."
        action={
          <div className="heading-actions">
            <button className="button button-outline">
              <CalendarDays size={15} />
              July 2026
            </button>
            <ExportButton>Export</ExportButton>
          </div>
        }
      />
      <div className="analytics-toolbar">
        <div className="filter-label">
          <span>Filter category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <span className="live-status">
          <i /> Demo data · Updated just now
        </span>
      </div>
      <div className="metric-grid analytics-metrics">
        <MetricCard
          label="Total Expenses"
          value={formatRupees(total)}
          note={`${filtered.length} records in this view`}
        />
        <MetricCard
          label="Expense Entries"
          value={String(filtered.length)}
          note="July 2026"
          tone="green"
        />
        <MetricCard
          label="Highest Expense"
          value={formatRupees(
            Math.max(...filtered.map((item) => item.amount), 0),
          )}
          note={highExpenses[0]?.vendor ?? "No entries"}
          tone="orange"
        />
        <MetricCard
          label="Average Expense"
          value={formatRupees(
            filtered.length ? Math.round(total / filtered.length) : 0,
          )}
          note="Per expense entry"
        />
      </div>
      <div className="analytics-grid">
        <section className="panel category-panel">
          <div className="panel-heading">
            <div>
              <h2>Spending by Category</h2>
              <p>Breakdown of this month's expenses.</p>
            </div>
            <TrendingUp size={18} className="muted-icon" />
          </div>
          <div className="category-bars">
            {categoryTotals.map((item) => (
              <div className="category-bar-row" key={item.name}>
                <div>
                  <span>{item.name}</span>
                  <strong>{formatRupees(item.amount)}</strong>
                </div>
                <div className="bar-track">
                  <i
                    style={{
                      width: `${Math.max((item.amount / Math.max(total, 1)) * 100, item.amount ? 5 : 0)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel insights-panel">
          <div className="panel-heading">
            <div>
              <h2>Spending Insights</h2>
              <p>A quick view of expense activity.</p>
            </div>
          </div>
          <div className="insight-card">
            <span className="insight-icon">↑</span>
            <div>
              <small>HIGHEST SPEND</small>
              <strong>
                {formatRupees(
                  Math.max(...filtered.map((item) => item.amount), 0),
                )}
              </strong>
              <span>{highExpenses[0]?.vendor ?? "No expense recorded"}</span>
            </div>
          </div>
          <div className="insight-card">
            <span className="insight-icon green">✓</span>
            <div>
              <small>RECEIPTS ATTACHED</small>
              <strong>
                {filtered.filter((item) => item.receipt).length} of{" "}
                {filtered.length}
              </strong>
              <span>Expenses with documentation</span>
            </div>
          </div>
        </section>
      </div>
      <section className="panel ranking-panel">
        <div className="panel-heading">
          <div>
            <h2>Top Expenses</h2>
            <p>Largest transactions in the selected view.</p>
          </div>
          <span className="record-count">{filtered.length} entries</span>
        </div>
        <div className="ranking-list">
          {highExpenses.map((expense, index) => (
            <button
              className="ranking-row"
              key={expense.id}
              onClick={() => navigate(`/expenses/${expense.id}`)}
            >
              <span className="rank-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="ranking-name">
                <strong>{expense.purpose}</strong>
                <small>
                  {expense.vendor} · {expense.category}
                </small>
              </span>
              <span className="ranking-bar">
                <i style={{ width: `${(expense.amount / max) * 100}%` }} />
              </span>
              <strong>{formatRupees(expense.amount)}</strong>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
