import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  Building2,
  ChartNoAxesCombined,
  Check,
  CircleEllipsis,
  Download,
  FileWarning,
  Plus,
  ReceiptText,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  downloadExpensesCsv,
  formatDate,
  formatRupees,
} from "../data/expenses";
import { useExpenses } from "../store";
import { getCurrentMonthValue } from "../data/dates";
import { StatusBadge, useGlobalExpenseSearch } from "../components/Shared";
import { MonthPicker } from "../components/MonthPicker";
import type { Expense } from "../types";

type GroupTotal = { name: string; type: string; amount: number; count: number };

function groupExpenses(
  expenses: Expense[],
  key: "paidFor" | "paidForType" | "category",
) {
  const groups = new Map<string, GroupTotal>();
  expenses.forEach((expense) => {
    const name = expense[key] || "Other";
    const current = groups.get(name) ?? {
      name,
      type: key === "paidForType" ? name : expense.paidForType,
      amount: 0,
      count: 0,
    };
    current.amount += expense.amount;
    current.count += 1;
    groups.set(name, current);
  });
  return [...groups.values()];
}

export function Dashboard() {
  const { expenses } = useExpenses();
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [period, setPeriod] = useState<"Weekly" | "Daily">("Weekly");
  const [leaderboard, setLeaderboard] = useState<"amount" | "frequency">(
    "amount",
  );
  const [localSearch, setLocalSearch] = useState("");
  const search = useGlobalExpenseSearch() || localSearch;
  const monthlyExpenses = useMemo(
    () => expenses.filter((item) => item.date.startsWith(selectedMonth)),
    [expenses, selectedMonth],
  );
  const filtered = useMemo(
    () =>
      monthlyExpenses.filter((item) =>
        `${item.id} ${item.vendor} ${item.purpose} ${item.category} ${item.paidFor}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [monthlyExpenses, search],
  );
  const total = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const average = monthlyExpenses.length ? Math.round(total / monthlyExpenses.length) : 0;
  const clients = new Set(monthlyExpenses.filter((expense) => expense.paidForType === "Client").map((expense) => expense.paidFor)).size;
  const employees = new Set(monthlyExpenses.filter((expense) => expense.paidForType === "Employee").map((expense) => expense.paidFor)).size;
  const entities = clients;
  const attached = monthlyExpenses.filter((expense) => expense.receipt).length;
  const missing = monthlyExpenses.length - attached;
  const pending = monthlyExpenses.filter((expense) => expense.status === "Pending").length;
  const selectedDate = new Date(`${selectedMonth}-01T00:00:00`);
  const monthName = selectedDate.toLocaleDateString("en-US", { month: "long" });
  const year = selectedDate.getFullYear();
  const daysInMonth = new Date(year, selectedDate.getMonth() + 1, 0).getDate();
  const dailyTotals = getDailyTotals(monthlyExpenses, selectedMonth, daysInMonth);
  const weeklyTotals = getWeeklyTotals(monthlyExpenses, selectedMonth, daysInMonth);
  const chartTotals = period === "Daily" ? dailyTotals : weeklyTotals;
  const dailyPeak = Math.max(...dailyTotals, 0);
  const dailyPeakDay = dailyTotals.indexOf(dailyPeak) + 1;
  const chartMax = Math.max(...chartTotals, 1);
  const dailyTickDays = [...new Set([1, Math.round(daysInMonth * 0.25), Math.round(daysInMonth * 0.5), Math.round(daysInMonth * 0.75), daysInMonth])];
  const highestByWho = groupExpenses(filtered, "paidFor").sort((a, b) =>
    leaderboard === "amount" ? b.amount - a.amount : b.count - a.count,
  );
  const byWho = groupExpenses(monthlyExpenses, "paidForType").sort(
    (a, b) => b.amount - a.amount,
  );
  const byCategory = groupExpenses(monthlyExpenses, "category").sort(
    (a, b) => b.amount - a.amount,
  );
  const recent = [...filtered].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  return (
    <div className="figma-dashboard">
      <header className="dashboard-heading">
        <div>
          <h1>Expense Dashboard</h1>
          <p>A clear view of Desflyer&apos;s spending this month.</p>
        </div>
        <div className="dashboard-heading-actions">
          <MonthPicker className="dashboard-date" label="Select dashboard month and year" value={selectedMonth} onChange={setSelectedMonth} />
        </div>
      </header>

      <div className="dashboard-canvas">
        <section className="dashboard-kpis" aria-label="Monthly expense summary">
          <article className="dashboard-kpi">
            <span className="kpi-label">TOTAL SPENT</span>
            <strong>{formatRupees(total)}</strong>
            <span className="kpi-foot kpi-positive">
              {monthlyExpenses.length ? <><ArrowDownRight size={14} />+12% from last month</> : "No expenses yet"}
            </span>
          </article>
          <article className="dashboard-kpi">
            <span className="kpi-label">AVERAGE EXPENSE</span>
            <strong>{formatRupees(average)}</strong>
            <span className="kpi-foot">Per transaction</span>
          </article>
          <article className="dashboard-kpi">
            <span className="kpi-label">EXPENSE ENTRIES</span>
            <strong>{monthlyExpenses.length}</strong>
            <span className="kpi-foot">This month</span>
          </article>
          <article className="dashboard-kpi">
            <span className="kpi-label">PEOPLE / CLIENTS</span>
            <strong>{entities}</strong>
            <span className="kpi-foot">Active entities</span>
          </article>
        </section>

        <section className="dashboard-chart panel">
          <div className="dashboard-panel-heading">
            <div>
              <h2>Spending Trend</h2>
              <p>{period === "Weekly" ? "Weekly expenditure overview" : "Daily expenditure by date"}</p>
            </div>
            <div className="dashboard-period" aria-label="Chart period">
              {(["Weekly", "Daily"] as const).map((item) => (
                <button
                  key={item}
                  className={period === item ? "selected" : ""}
                  onClick={() => setPeriod(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className={`dashboard-plot dashboard-line-plot ${monthlyExpenses.length ? "has-trend-data" : ""}`}>
            {monthlyExpenses.length ? <>
              <svg viewBox="0 0 1000 190" preserveAspectRatio="none" role="img" aria-label={`${period} spending bar chart`}>
                <g className="trend-bars">{chartTotals.map((amount, index) => {
                  const x = period === "Daily"
                    ? 14 + (index / Math.max(chartTotals.length - 1, 1)) * 890
                    : 80 + (index / Math.max(chartTotals.length - 1, 1)) * 840;
                  const barWidth = period === "Daily"
                    ? Math.min(22, 890 / chartTotals.length * 0.68)
                    : Math.min(92, 890 / chartTotals.length * 0.55);
                  const barHeight = (amount / chartMax) * 120;
                  return amount > 0 ? <rect key={index} x={x - barWidth / 2} y={164 - barHeight} width={barWidth} height={barHeight} rx="3"><title>{period} {index + 1}: {formatRupees(amount)}</title></rect> : null;
                })}</g>
              </svg>
              {period === "Weekly" ? <>
                <div className="trend-value-labels">{weeklyTotals.map((amount, index) => <span key={index} style={{ left: `${getBarCenterPercent(index, weeklyTotals.length)}%` }}>{formatRupees(amount)}</span>)}</div>
                <span className="trend-highest">HIGHEST</span>
                <div className="trend-week-labels">{weeklyTotals.map((_, index) => <span key={index} style={{ left: `${getBarCenterPercent(index, weeklyTotals.length)}%` }}>Week {index + 1}</span>)}</div>
              </> : <>
                <div className="trend-value-labels trend-daily-summary">Peak {formatRupees(dailyPeak)} on {dailyPeakDay} {monthName.slice(0, 3)}</div>
                <div className="trend-week-labels daily-ticks">{dailyTickDays.map((day) => <span key={day}>{day} {monthName.slice(0, 3)}</span>)}</div>
              </>}
            </> : <div className="plot-empty">Add expenses to see spending trends here.</div>}
          </div>
        </section>

        <div className="dashboard-middle-grid">
          <section className="dashboard-highest panel">
            <div className="dashboard-panel-heading dashboard-high-heading">
              <div>
                <h2>Highest Spending</h2>
                <div className="dashboard-sort-tabs">
                  <button className={leaderboard === "amount" ? "selected" : ""} onClick={() => setLeaderboard("amount")}>By Amount</button>
                  <button className={leaderboard === "frequency" ? "selected" : ""} onClick={() => setLeaderboard("frequency")}>By Frequency</button>
                </div>
              </div>
              <Link to="/expenses" className="dashboard-link">View All</Link>
            </div>
            <div className="dashboard-high-list">
              {highestByWho.slice(0, 4).map((item) => (
                <button className="dashboard-high-row" key={item.name} onClick={() => navigate(`/expenses?search=${encodeURIComponent(item.name)}`)}>
                  <span className="dashboard-category-icon">{item.type === "Client" ? <Building2 size={19} /> : <UserRound size={19} />}</span>
                  <span className="dashboard-row-detail"><strong>{item.name}</strong><small>{item.type}</small></span>
                  <strong className="dashboard-row-amount">{leaderboard === "amount" ? formatRupees(item.amount) : `${item.count} entries`}</strong>
                </button>
              ))}
              {highestByWho.length === 0 && <div className="dashboard-empty"><p>No expenses recorded yet.</p></div>}
            </div>
          </section>

          <section className="dashboard-spending-hero panel">
            <div className="spending-hero-main">
              <span className="spending-month-pill">{monthName} Spending</span>
              <strong className="spending-hero-total">{formatRupees(total)}</strong>
              <div className="spending-hero-meta">
                <span><ReceiptText size={13} /> {monthlyExpenses.length} expenses</span>
                <i />
                <span>{formatRupees(average)} average per expense</span>
              </div>
              <Link className="spending-add-button" to="/expenses/new"><Plus size={15} /> Add Expense</Link>
            </div>
            <div className="spending-insight">
              <div className="insight-mark"><ChartNoAxesCombined size={27} /><Sparkles className="insight-sparkles" size={14} /></div>
              <p>{monthlyExpenses.length ? `You've recorded ${monthlyExpenses.length} expenses across ${clients} clients, ${employees} employees and company operations.` : "Your monthly spending insight will appear here once expenses are recorded."}</p>
            </div>
            <span className="insight-orb" />
          </section>
        </div>

        <section className="dashboard-analytics-grid">
          <article className="dashboard-analytics-card panel">
            <div className="dashboard-panel-heading">
              <h2>Who are we spending for?</h2>
              <Link to="/analytics" className="dashboard-link">View Breakdown</Link>
            </div>
            <div className="dashboard-breakdown-list">
              {byWho.slice(0, 4).map((item) => <BreakdownRow key={item.name} label={item.name === "Client" ? "Clients" : item.name === "Employee" ? "Employees" : item.name} amount={item.amount} total={total} />)}
              {byWho.length === 0 && <p className="dashboard-empty">Spending breakdown will appear when expenses are added.</p>}
            </div>
          </article>
          <article className="dashboard-analytics-card panel">
            <div className="dashboard-panel-heading">
              <h2>What are we spending on?</h2>
              <Link to="/analytics" className="dashboard-link">View All Categories</Link>
            </div>
            <div className="dashboard-category-list">
              {byCategory.slice(0, 6).map((item) => <BreakdownRow key={item.name} label={item.name} amount={item.amount} total={total} compact />)}
              {byCategory.length === 0 && <p className="dashboard-empty">Category breakdown will appear when expenses are added.</p>}
            </div>
          </article>
        </section>

        <section className="dashboard-documents panel">
          <div className="dashboard-doc-title"><h2>Documentation Status</h2></div>
          <div className="document-status-grid">
            <article className="document-status-card">
              <Check size={20} />
              <div><strong>{attached} Bills Attached</strong><small>Verified documentation</small></div>
            </article>
            <article className="document-status-card missing">
              <FileWarning size={21} />
              <div><strong>{missing} Bills Missing</strong><small>Action required</small></div>
            </article>
            <article className="document-status-card">
              <CircleEllipsis size={20} />
              <div><strong>{pending} To Review</strong><small>Pending verification</small></div>
            </article>
          </div>
        </section>

        <section className="dashboard-transactions panel">
          <div className="transactions-heading">
            <h2>Recent Expenses</h2>
            <Link to="/expenses" className="dashboard-link">View All</Link>
          </div>
          <div className="dashboard-table-wrap">
            <table className="dashboard-table transactions-table">
              <thead><tr><th>DATE</th><th>PAID FOR</th><th>TYPE</th><th>PURPOSE</th><th>BILL</th><th>STATUS</th><th>AMOUNT</th></tr></thead>
              <tbody>
                {recent.slice(0, 2).map((expense: Expense) => (
                  <tr key={expense.id} onClick={() => navigate(`/expenses/${expense.id}`)}>
                    <td>{formatDate(expense.date)}</td>
                    <td><strong>{expense.paidFor}</strong></td>
                    <td><span className="dashboard-type-pill">{expense.paidForType}</span></td>
                    <td>{expense.purpose}</td>
                    <td><span className={expense.receipt ? "bill-attached" : "bill-missing"}>{expense.receipt ? "✓" : "×"}</span></td>
                    <td><StatusBadge status={expense.status} /></td>
                    <td><strong>{formatRupees(expense.amount)}</strong></td>
                  </tr>
                ))}
                {recent.length === 0 && <tr><td colSpan={7} className="dashboard-table-empty">No expenses recorded yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="dashboard-summary">
          <div><span>{monthName.toUpperCase()} {year} SUMMARY</span><strong>{formatRupees(total)} <i>•</i> {monthlyExpenses.length} Entries <i>•</i> {missing} Missing Bills</strong></div>
          <button className="dashboard-report-button" onClick={() => downloadExpensesCsv(expenses)}><Download size={16} /> Download Full Report</button>
        </footer>
      </div>
      <footer className="dashboard-page-footer">
        <span>© 2026 Internal Expense. Discover. Build. Share. Innovate.</span>
        <strong>POWERED BY DESFLYER</strong>
      </footer>
    </div>
  );
}

function BreakdownRow({
  label,
  amount,
  total,
  compact = false,
}: {
  label: string;
  amount: number;
  total: number;
  compact?: boolean;
}) {
  const share = total ? Math.round((amount / total) * 100) : 0;
  return (
    <div className={`breakdown-row ${compact ? "compact" : ""}`}>
      <div className="breakdown-labels"><span>{label}</span><strong>{formatRupees(amount)}{compact ? "" : ` (${share}%)`}</strong></div>
      <div className="breakdown-track"><span style={{ width: `${share}%` }} /></div>
    </div>
  );
}

function getDailyTotals(expenses: Expense[], month: string, daysInMonth: number) {
  const totals = Array.from({ length: daysInMonth }, () => 0);
  expenses.forEach((expense) => {
    if (!expense.date.startsWith(month)) return;
    const day = Number(expense.date.slice(-2));
    if (day >= 1 && day <= daysInMonth) totals[day - 1] += expense.amount;
  });
  return totals;
}

function getWeeklyTotals(expenses: Expense[], month: string, daysInMonth: number) {
  const totals = Array.from({ length: 4 }, () => 0);
  expenses.forEach((expense) => {
    if (!expense.date.startsWith(month)) return;
    const day = Number(expense.date.slice(-2));
    const weekIndex = Math.min(Math.floor((day - 1) / 7), totals.length - 1);
    if (day >= 1 && day <= daysInMonth) {
      totals[weekIndex] += expense.amount;
    }
  });
  return totals;
}

function getBarCenterPercent(index: number, count: number) {
  const x = 80 + (index / Math.max(count - 1, 1)) * 840;
  return 2 + (x / 1000) * 96;
}

