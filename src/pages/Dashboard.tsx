import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Download,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { downloadExpensesCsv, formatRupees } from "../data/expenses";
import { useExpenses } from "../store";
import {
  MetricCard,
  PageHeading,
  StatusBadge,
  useGlobalExpenseSearch,
} from "../components/Shared";
import type { Expense } from "../types";

export function Dashboard() {
  const { expenses } = useExpenses();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<"Weekly" | "Daily">("Weekly");
  const [localSearch, setLocalSearch] = useState("");
  const search = useGlobalExpenseSearch() || localSearch;
  const filtered = useMemo(
    () =>
      expenses.filter((item) =>
        `${item.vendor} ${item.purpose} ${item.category}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [expenses, search],
  );
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const recent = filtered.slice(0, 5);

  return (
    <>
      <PageHeading
        title="Expense Dashboard"
        description="A clear view of DesFlyer's spending this month."
        action={
          <button className="button button-outline">
            <CalendarDays size={15} />
            July 2026
          </button>
        }
      />
      <div className="metric-grid">
        <MetricCard
          label="Total Expenses"
          value={formatRupees(total)}
          note="This month"
        />
        <MetricCard
          label="Expense Entries"
          value={String(expenses.length)}
          note="Recorded this month"
          tone="green"
        />
        <MetricCard
          label="Pending Review"
          value={String(
            expenses.filter((item) => item.status === "Pending").length,
          )}
          note="Waiting for approval"
          tone="orange"
        />
        <MetricCard
          label="Missing Receipts"
          value={String(expenses.filter((item) => !item.receipt).length)}
          note="Follow up required"
        />
      </div>
      <section className="panel trend-panel">
        <div className="panel-heading">
          <div>
            <h2>Spending Trend</h2>
            <p>Weekly expenditure overview</p>
          </div>
          <div className="segmented">
            <button
              className={period === "Weekly" ? "selected" : ""}
              onClick={() => setPeriod("Weekly")}
            >
              Weekly
            </button>
            <button
              className={period === "Daily" ? "selected" : ""}
              onClick={() => setPeriod("Daily")}
            >
              Daily
            </button>
          </div>
        </div>
        <div className="chart-area">
          <div className="chart-y-labels">
            <span>₹30k</span>
            <span>₹20k</span>
            <span>₹10k</span>
            <span>₹0</span>
          </div>
          <svg
            className="trend-chart"
            viewBox="0 0 1000 190"
            role="img"
            aria-label={`${period} expenses chart`}
          >
            <defs>
              <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#1677ff" stopOpacity=".16" />
                <stop offset="1" stopColor="#1677ff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 35H1000 M0 85H1000 M0 135H1000 M0 185H1000"
              stroke="#edf0f4"
              strokeDasharray="4 5"
            />
            <path
              d="M20 132 C120 118 145 110 240 102 S350 86 450 98 S580 65 680 74 S790 30 980 18 V185 H20Z"
              fill="url(#fill)"
            />
            <path
              d="M20 132 C120 118 145 110 240 102 S350 86 450 98 S580 65 680 74 S790 30 980 18"
              fill="none"
              stroke="#1677ff"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle
              cx="980"
              cy="18"
              r="5"
              fill="#fff"
              stroke="#1677ff"
              strokeWidth="3"
            />
          </svg>
        </div>
        <div className="chart-labels">
          <span>Week 1</span>
          <span>Week 2</span>
          <span>Week 3</span>
          <span>Week 4</span>
        </div>
      </section>
      <div className="dashboard-lower">
        <section className="panel highest-panel">
          <div className="panel-heading">
            <div>
              <h2>Highest Spending</h2>
              <p>Largest expenses this month</p>
            </div>
            <Link to="/expenses" className="text-link">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="high-list">
            {[...filtered]
              .sort((a, b) => b.amount - a.amount)
              .slice(0, 4)
              .map((expense) => (
                <button
                  className="high-row"
                  key={expense.id}
                  onClick={() => navigate(`/expenses/${expense.id}`)}
                >
                  <span className="category-icon">
                    <ReceiptText size={18} />
                  </span>
                  <span className="high-detail">
                    <strong>{expense.vendor}</strong>
                    <small>
                      {expense.category} · {expense.paidForType}
                    </small>
                  </span>
                  <strong className="high-amount">
                    {formatRupees(expense.amount)}
                  </strong>
                </button>
              ))}
          </div>
        </section>
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent Expenses</h2>
              <p>Latest activity across the team</p>
            </div>
            <button
              className="icon-button"
              title="Download report"
              onClick={() => downloadExpensesCsv(expenses)}
            >
              <Download size={17} />
            </button>
          </div>
          <div className="dashboard-search">
            <input
              placeholder="Filter this list..."
              value={localSearch}
              onChange={(event) => setLocalSearch(event.target.value)}
            />
          </div>
          <div className="recent-list">
            {recent.map((expense: Expense) => (
              <button
                className="recent-row"
                key={expense.id}
                onClick={() => navigate(`/expenses/${expense.id}`)}
              >
                <span className="recent-dot" />
                <span className="recent-detail">
                  <strong>{expense.purpose}</strong>
                  <small>{expense.vendor}</small>
                </span>
                <span className="recent-right">
                  <strong>{formatRupees(expense.amount)}</strong>
                  <StatusBadge status={expense.status} />
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
      <section className="monthly-summary">
        <div>
          <span>JULY 2026 SUMMARY</span>
          <strong>
            {formatRupees(total)} <i>•</i> {expenses.length} Entries <i>•</i>{" "}
            {expenses.filter((item) => !item.receipt).length} Missing Bills
          </strong>
        </div>
        <button
          className="button button-primary"
          onClick={() => downloadExpensesCsv(expenses)}
        >
          <Download size={16} />
          Download Full Report
        </button>
      </section>
    </>
  );
}
