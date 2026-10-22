import { useMemo, useState } from "react";
import { ArrowDownRight, CalendarDays, ChevronDown, Download, RotateCcw, Trophy, Users, Wallet } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { downloadExpensesCsv, formatDate, formatRupees } from "../data/expenses";
import { useExpenses } from "../store";
import type { Expense } from "../types";

const chartColors = ["#1677ff", "#0057c2", "#9bb7ff", "#d9e2ff", "#414755", "#a5abb8"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function FilterSelect({
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
    <label className="analytics-filter">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
      <ChevronDown size={14} />
    </label>
  );
}

function groupByAmount(expenses: Expense[], key: "paidForType" | "paidFor") {
  const totals = new Map<string, number>();
  expenses.forEach((expense) => totals.set(key === "paidForType" ? expense.paidForType : expense.paidFor, (totals.get(key === "paidForType" ? expense.paidForType : expense.paidFor) ?? 0) + expense.amount));
  return [...totals].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
}

export function Analytics() {
  const { expenses } = useExpenses();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const today = new Date();
  const currentPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [period, setPeriod] = useState(currentPeriod);
  const [department, setDepartment] = useState("All Departments");
  const [employee, setEmployee] = useState("All Employees");
  const [client, setClient] = useState("All Clients");
  const [category, setCategory] = useState("Category: All");
  const [status, setStatus] = useState("Status: Approved");
  const [trendPeriod, setTrendPeriod] = useState<"Monthly" | "Weekly" | "Yearly">("Monthly");
  const periods = Array.from({ length: 24 }, (_, index) => {
    const date = new Date(currentYear, new Date().getMonth() - index, 1);
    return { value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`, label: date.toLocaleDateString("en", { month: "long", year: "numeric" }) };
  });
  const [year] = period.split("-");
  const periodLabel = periods.find((item) => item.value === period)?.label ?? period;
  const departments = [...new Set(expenses.map((item) => item.paidForType))].sort();
  const employees = [...new Set(expenses.filter((item) => item.paidForType === "Employee").map((item) => item.paidFor))].sort();
  const clients = [...new Set(expenses.filter((item) => item.paidForType === "Client").map((item) => item.paidFor))].sort();
  const categories = [...new Set(expenses.map((item) => item.category))].sort();
  const filteredForYear = useMemo(
    () => expenses.filter((item) => {
      if (!item.date.startsWith(`${year}-`)) return false;
      if (department !== "All Departments" && item.paidForType !== department) return false;
      if (employee !== "All Employees" && (item.paidForType !== "Employee" || item.paidFor !== employee)) return false;
      if (client !== "All Clients" && (item.paidForType !== "Client" || item.paidFor !== client)) return false;
      if (category !== "Category: All" && item.category !== category) return false;
      if (status !== "Status: All" && item.status !== (status === "Status: Approved" ? "Verified" : status.replace("Status: ", ""))) return false;
      return true;
    }),
    [expenses, year, department, employee, client, category, status],
  );
  const filtered = filteredForYear.filter((item) => item.date.startsWith(`${period}-`));
  const total = filtered.reduce((sum, item) => sum + item.amount, 0);
  const people = new Set(filtered.map((item) => item.paidFor)).size;
  const monthTotals = months.map((_, index) => filteredForYear
    .filter((expense) => new Date(`${expense.date}T00:00:00`).getMonth() === index)
    .reduce((sum, expense) => sum + expense.amount, 0));
  const chartMax = Math.max(...monthTotals, 1);
  const points = monthTotals.map((amount, index) => `${34 + index * 57},${235 - (amount / chartMax) * 190}`).join(" ");
  const categoryTotals = [...new Set(filtered.map((item) => item.category))].map((name) => ({
    name,
    amount: filtered.filter((item) => item.category === name).reduce((sum, item) => sum + item.amount, 0),
  })).sort((a, b) => b.amount - a.amount);
  let gradientOffset = 0;
  const donutGradient = categoryTotals.length
    ? `conic-gradient(${categoryTotals.map((item, index) => {
      const start = gradientOffset;
      gradientOffset += total ? (item.amount / total) * 100 : 0;
      return `${chartColors[index % chartColors.length]} ${start}% ${gradientOffset}%`;
    }).join(", ")})`
    : "conic-gradient(#e9edff 0% 100%)";
  const byRecipient = groupByAmount(filtered, "paidFor").slice(0, 5);
  const highestExpenses = [...filtered].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const typeTotals = groupByAmount(filtered, "paidForType");
  const maxTypeAmount = Math.max(...typeTotals.map((item) => item.amount), 1);
  const topEmployees = groupByAmount(filtered.filter((item) => item.paidForType === "Employee"), "paidFor").slice(0, 2);
  const topClients = groupByAmount(filtered.filter((item) => item.paidForType === "Client"), "paidFor").slice(0, 2);
  const updateFilter = (setter: (value: string) => void) => (value: string) => setter(value);

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <div>
          <h1>Expense Analytics</h1>
          <p>Analyze company spending and financial performance across all departments.</p>
        </div>
        <div className="analytics-header-actions">
          <label className="analytics-year-picker">
            <CalendarDays size={16} />
            <select aria-label="Select analytics month and year" value={period} onChange={(event) => setPeriod(event.target.value)}>
              {periods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <ChevronDown size={14} />
          </label>
          <button className="button button-outline analytics-export" onClick={() => downloadExpensesCsv(filtered)}>
            <Download size={14} /> Export
          </button>
        </div>
      </header>

      <section className="analytics-filters" aria-label="Analytics filters">
        <FilterSelect label="Department" value={department} options={["All Departments", ...departments]} onChange={updateFilter(setDepartment)} />
        <FilterSelect label="Employee" value={employee} options={["All Employees", ...employees]} onChange={updateFilter(setEmployee)} />
        <FilterSelect label="Client" value={client} options={["All Clients", ...clients]} onChange={updateFilter(setClient)} />
        <FilterSelect label="Category" value={category} options={["Category: All", ...categories]} onChange={updateFilter(setCategory)} />
        <FilterSelect label="Status" value={status} options={["Status: All", "Status: Approved", "Status: Pending", "Status: Needs receipt"]} onChange={updateFilter(setStatus)} />
        <button className="analytics-reset-filter" aria-label="Reset filters" onClick={() => { setDepartment("All Departments"); setEmployee("All Employees"); setClient("All Clients"); setCategory("Category: All"); setStatus("Status: Approved"); }}><RotateCcw size={14} />Reset Filters</button>
      </section>

      <section className="analytics-overview" aria-label="Financial overview">
        <article className="analytics-kpi analytics-kpi-total">
          <span>Total Expenses</span><strong>{formatRupees(total)}</strong><small>This month</small>
          <em><ArrowDownRight size={14} /> +4.1% vs prev. month</em>
        </article>
        <article className="analytics-kpi">
          <span>Expense Entries</span><strong>{filtered.length}</strong><small>This month</small>
        </article>
        <article className="analytics-kpi">
          <span>People/Clients</span><strong>{people}</strong><small>Active entities</small>
        </article>
      </section>

      <section className="analytics-chart-row">
        <article className="panel analytics-trend-panel">
          <div className="analytics-panel-heading"><div><h2>Monthly Expense Trend</h2><p>Expense totals by month in {year}</p></div><div className="analytics-trend-controls">{(["Monthly", "Weekly", "Yearly"] as const).map((item) => <button key={item} className={trendPeriod === item ? "selected" : ""} onClick={() => setTrendPeriod(item)}>{item}</button>)}</div></div>
          {filtered.length ? (
            <div className="analytics-line-chart">
              <div className="analytics-y-labels"><span>{formatRupees(chartMax)}</span><span>{formatRupees(chartMax / 2)}</span><span>₹0</span></div>
              <svg viewBox="0 0 700 260" role="img" aria-label={`Monthly spending trend for ${year}`} preserveAspectRatio="none">
                <g className="analytics-grid-lines"><line x1="30" y1="45" x2="690" y2="45"/><line x1="30" y1="140" x2="690" y2="140"/><line x1="30" y1="235" x2="690" y2="235"/></g>
                <polyline points={points} />
                {monthTotals.map((amount, index) => <circle key={months[index]} cx={34 + index * 57} cy={235 - (amount / chartMax) * 190} r="4" className={amount ? "has-value" : ""} />)}
              </svg>
              <div className="analytics-x-labels">{months.map((month) => <span key={month}>{month}</span>)}</div>
            </div>
          ) : <div className="analytics-empty">No expenses recorded for {year}.</div>}
        </article>
        <article className="panel analytics-category-panel">
          <div className="analytics-panel-heading"><div><h2>Category Breakdown</h2><p>Share of expenses by category</p></div></div>
          <div className="analytics-donut-wrap">
            <div className="analytics-donut" style={{ background: donutGradient }}><div><strong>{formatRupees(total)}</strong><span>Total spend</span></div></div>
          </div>
          <div className="analytics-category-legend">
            {categoryTotals.slice(0, 5).map((item, index) => <div key={item.name}><i style={{ background: chartColors[index % chartColors.length] }} /><span>{item.name}</span><strong>{total ? Math.round(item.amount / total * 100) : 0}%</strong></div>)}
            {!categoryTotals.length && <p className="analytics-empty-small">Category totals will appear when expenses are added.</p>}
          </div>
        </article>
      </section>

      <section className="analytics-comparison-row">
        <article className="panel analytics-recipient-panel">
          <div className="analytics-panel-heading"><div><h2>Spending By Recipient</h2><p>Highest spend by person or client</p></div></div>
          <div className="analytics-recipient-list">
            {byRecipient.map((item) => <div className="analytics-recipient" key={item.name}><div><span>{item.name}</span><strong>{formatRupees(item.amount)}</strong></div><i><span style={{ width: `${(item.amount / Math.max(...byRecipient.map((entry) => entry.amount), 1)) * 100}%` }} /></i></div>)}
            {!byRecipient.length && <div className="analytics-empty">Recipient totals will appear when expenses are added.</div>}
          </div>
        </article>
        <div className="analytics-right-stack">
          <article className="panel analytics-budget-card">
            <div className="analytics-panel-heading"><h2>Monthly Budget Utilization</h2><span className={total > 1000000 ? "budget-flag over" : "budget-flag"}>{total > 1000000 ? "Over Budget" : "Within Budget"}</span></div>
            <div className="analytics-budget-labels"><strong>Actual Spending: {formatRupees(total)}</strong><span>Budget: ₹10,00,000</span></div>
            <div className="analytics-budget-bar"><i style={{ width: `${Math.min(100, total / 1000000 * 100)}%` }} /></div>
            <small>{total > 1000000 ? `Exceeded by ${formatRupees(total - 1000000)} (${((total - 1000000) / 1000000 * 100).toFixed(1)}% above cap)` : `${formatRupees(1000000 - total)} remaining in monthly cap`}</small>
          </article>
          <article className="panel analytics-department-card">
            <div className="analytics-panel-heading"><h2>Departmental Share</h2></div>
            <div className="analytics-type-list">
              {typeTotals.map((item) => <div className="analytics-type-row" key={item.name}><div><span>{item.name}</span><strong>{formatRupees(item.amount)} ({total ? Math.round(item.amount / total * 100) : 0}%)</strong></div><i><span style={{ width: `${(item.amount / maxTypeAmount) * 100}%` }} /></i></div>)}
              {!typeTotals.length && <div className="analytics-empty">Department totals will appear when expenses are added.</div>}
            </div>
          </article>
        </div>
      </section>

      <section className="analytics-table-leaderboards-row">
        <article className="panel analytics-top-expenses">
          <div className="analytics-table-heading"><h2>Top 5 Highest Expenses</h2><Link to="/expenses">View All</Link></div>
          <div className="analytics-table-wrap">
            <table className="analytics-table">
              <thead><tr><th>RANK</th><th>EXPENSE NAME</th><th>CATEGORY</th><th>AMOUNT</th><th>DATE</th><th>ACTION</th></tr></thead>
              <tbody>
                {highestExpenses.map((expense, index) => <tr key={expense.id} onClick={() => navigate(`/expenses/${expense.id}`)}><td>#{index + 1}</td><td><strong>{expense.purpose}</strong></td><td>{expense.category}</td><td><strong>{formatRupees(expense.amount)}</strong></td><td>{formatDate(expense.date)}</td><td><Link to={`/expenses/${expense.id}`} aria-label={`View ${expense.purpose}`}>◉</Link></td></tr>)}
                {!highestExpenses.length && <tr><td colSpan={6} className="analytics-empty-cell">No expenses recorded for the selected filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>
        <aside className="analytics-leaderboards" aria-label="Leaderboards">
          <article className="panel analytics-leaderboard-card">
            <h2><Trophy size={16} /> Top Expensive Employees</h2>
            {topEmployees.map((item, index) => <div className="analytics-leaderboard-entry" key={item.name}><i>{index + 1}</i><div><strong>{item.name}</strong><small>EMPLOYEE</small></div><b>{formatRupees(item.amount)}</b></div>)}
            {!topEmployees.length && <p className="analytics-empty-small">No employee data for this period.</p>}
          </article>
          <article className="panel analytics-leaderboard-card analytics-most-frequent">
            <h2><Users size={16} /> Top Expensive Clients</h2>
            {topClients.map((item, index) => <div className="analytics-leaderboard-entry" key={item.name}><i>{index + 1}</i><div><strong>{item.name}</strong><small>CLIENT</small></div><b>{formatRupees(item.amount)}</b></div>)}
            {!topClients.length && <p className="analytics-empty-small">No client data for this period.</p>}
          </article>
        </aside>
      </section>

      <footer className="analytics-footer-summary">
        <div><span>TOTAL SPEND</span><strong>{formatRupees(total)}</strong></div>
        <div><span>EXPENSE ENTRIES</span><strong>{filtered.length}</strong></div>
        <div><span>PEOPLE / CLIENTS</span><strong>{people}</strong></div>
        <small><Wallet size={14} /> Showing expense analytics for {periodLabel}</small>
      </footer>
    </div>
  );
}
