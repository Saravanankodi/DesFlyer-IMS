import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Plus,
  ReceiptText,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { formatDate, formatRupees } from "../data/expenses";
import { useExpenses } from "../store";
import { getCurrentMonthValue } from "../data/dates";
import { StatusBadge, useGlobalExpenseSearch, useToast } from "../components/Shared";
import { MonthPicker } from "../components/MonthPicker";
import { MobileDashboardNotifications } from "../components/MobileDashboardNotifications";
import type { Expense } from "../types";
import clientIcon from "../assets/dashboard-client-icon.jpg";
import employeeIcon from "../assets/dashboard-employee-icon.jpg";
import verifiedStatusIcon from "../assets/status-verified.jpg";
import missingStatusIcon from "../assets/status-missing.jpg";
import reviewStatusIcon from "../assets/status-review.jpg";
import billAttachedIcon from "../assets/bill-attached-icon.jpg";
import billMissingIcon from "../assets/bill-missing-icon.jpg";
import monthlyInsightIcon from "../assets/monthly-insight-icon.jpg";

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
  const dashboardRef = useRef<HTMLDivElement>(null);
  const { showToast, toast } = useToast();
  const [exportingPdf, setExportingPdf] = useState(false);
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [period, setPeriod] = useState<"Weekly" | "Daily">("Daily");
  const [leaderboard, setLeaderboard] = useState<"amount" | "frequency">(
    "amount",
  );
  const [localSearch, setLocalSearch] = useState("");
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 760px)").matches);
  const search = useGlobalExpenseSearch() || localSearch;
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 760px)");
    const updateMobileLayout = () => setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", updateMobileLayout);
    return () => mediaQuery.removeEventListener("change", updateMobileLayout);
  }, []);
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
  const previousMonthDate = new Date(`${selectedMonth}-01T00:00:00`);
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const previousMonthExpenses = expenses.filter((item) => item.date.startsWith(previousMonth));
  const previousMonthTotal = previousMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const monthChangePercent = previousMonthTotal > 0 ? ((total - previousMonthTotal) / previousMonthTotal) * 100 : null;
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
  const highestWeeklyIndex = weeklyTotals.indexOf(Math.max(...weeklyTotals, 0));
  const chartTotals = period === "Daily" ? dailyTotals : weeklyTotals;
  const dailyPeak = Math.max(...dailyTotals, 0);
  const dailyPeakDay = dailyTotals.indexOf(dailyPeak) + 1;
  const chartMax = Math.max(...chartTotals, 1);
  const dailyTickDays = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const highestByWho = groupExpenses(filtered, "paidFor").sort((a, b) =>
    leaderboard === "amount" ? b.amount - a.amount : b.count - a.count,
  );
  const byWho = groupExpenses(monthlyExpenses, "paidForType").sort(
    (a, b) => b.amount - a.amount,
  );
  const byCategory = groupExpenses(monthlyExpenses, "category").sort(
    (a, b) => b.amount - a.amount,
  );
  const visibleWhoCount = Math.min(byWho.length, 4);
  const visibleCategoryCount = Math.min(byCategory.length, 6);
  const whoCardHeight = visibleWhoCount
    ? 94 + visibleWhoCount * 34.5 + (visibleWhoCount - 1) * 24
    : 162;
  const categoryCardHeight = visibleCategoryCount
    ? 94 + visibleCategoryCount * 18.5 + (visibleCategoryCount - 1) * 8
    : 162;
  const analyticsHeight = Math.max(whoCardHeight, categoryCardHeight);
  const highestVisibleCount = Math.min(highestByWho.length, 4);
  const middleCardHeight = Math.max(278, 122 + highestVisibleCount * 64);
  const dashboardLayoutShift = analyticsHeight - 324 + middleCardHeight - 378;
  const dashboardStyle = {
    "--dashboard-analytics-height": `${analyticsHeight}px`,
    "--dashboard-middle-height": `${middleCardHeight}px`,
    "--dashboard-layout-shift": `${dashboardLayoutShift}px`,
  } as CSSProperties;
  const recent = [...filtered].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const downloadDashboardPdf = async () => {
    if (!dashboardRef.current || exportingPdf) return;
    setExportingPdf(true);
    try {
      const source = dashboardRef.current;
      // Render exports at a desktop viewport even when the app is open on a phone.
      const exportWidth = Math.max(1601, Math.ceil(source.getBoundingClientRect().width));
      await document.fonts.ready;
      await Promise.all(Array.from(source.querySelectorAll("img"), (image) => image.decode().catch(() => undefined)));
      const canvas = await html2canvas(source, {
        scale: 1.5,
        backgroundColor: "#fff",
        useCORS: true,
        windowWidth: exportWidth,
        windowHeight: Math.max(900, window.innerHeight),
        onclone: (_clonedDocument, clonedElement) => {
          clonedElement.style.width = `${exportWidth}px`;
          clonedElement.style.maxWidth = "none";
          clonedElement.querySelector(".dashboard-report-button")?.remove();
          clonedElement.querySelectorAll<HTMLElement>(".dashboard-table-wrap").forEach((tableWrap) => {
            tableWrap.style.maxHeight = "none";
            tableWrap.style.height = "auto";
            tableWrap.style.overflow = "visible";
          });
        },
      });
      const imageData = canvas.toDataURL("image/png");
      const orientation = canvas.width > canvas.height ? "landscape" : "portrait";
      const pdf = new jsPDF({ orientation, unit: "mm", format: "a4", compress: true });
      const margin = 8;
      const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;
      const renderedHeight = canvas.height * (pageWidth / canvas.width);

      if (renderedHeight <= pageHeight) {
        pdf.addImage(imageData, "PNG", margin, margin, pageWidth, renderedHeight);
      } else {
        const sourcePageHeight = Math.floor(canvas.width * (pageHeight / pageWidth));
        let sourceY = 0;
        let pageIndex = 0;
        while (sourceY < canvas.height) {
          if (pageIndex > 0) pdf.addPage("a4", orientation);
          const sliceHeight = Math.min(sourcePageHeight, canvas.height - sourceY);
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeight;
          pageCanvas.getContext("2d")?.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
          pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", margin, margin, pageWidth, sliceHeight * (pageWidth / canvas.width));
          sourceY += sliceHeight;
          pageIndex += 1;
        }
      }
      pdf.save(`expense-dashboard-${selectedMonth}.pdf`);
    } catch (error) {
      console.error("Failed to export dashboard PDF", error);
      showToast("Could not create the dashboard PDF. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  };
  return (
    <div className="figma-dashboard" style={dashboardStyle} ref={dashboardRef}>
      <header className="dashboard-heading">
        <div>
          <h1>Expense Dashboard</h1>
          <p>A clear view of Desflyer&apos;s spending this month.</p>
        </div>
        <div className="dashboard-heading-actions">
          <MobileDashboardNotifications />
          <MonthPicker className="dashboard-date" label="Select dashboard month and year" value={selectedMonth} onChange={setSelectedMonth} compactOnMobile />
        </div>
      </header>

      <div className="dashboard-canvas">
        <section className="dashboard-kpis" aria-label="Monthly expense summary">
          <article className="dashboard-kpi">
            <span className="kpi-label">Total Spent</span>
            <strong>{formatRupees(total)}</strong>
            <span className={`kpi-foot ${monthChangePercent === null ? "kpi-neutral" : monthChangePercent < 0 ? "kpi-negative" : "kpi-positive"}`}>
              {!monthlyExpenses.length ? "No expenses yet" : monthChangePercent === null ? "No data last month" : <>{monthChangePercent < 0 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}{monthChangePercent > 0 ? "+" : ""}{monthChangePercent.toFixed(1)}% from last month</>}
            </span>
          </article>
          <article className="dashboard-kpi">
            <span className="kpi-label">Average Expense</span>
            <strong>{formatRupees(average)}</strong>
            <span className="kpi-foot">Per transaction</span>
          </article>
          <article className="dashboard-kpi">
            <span className="kpi-label">Expense Entries</span>
            <strong>{monthlyExpenses.length}</strong>
            <span className="kpi-foot">This month</span>
          </article>
          <article className="dashboard-kpi">
            <span className="kpi-label">People/Clients</span>
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
              {(["Daily", "Weekly"] as const).map((item) => (
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
          <div
            className={`dashboard-plot dashboard-line-plot ${monthlyExpenses.length ? "has-trend-data" : ""} ${period === "Daily" ? "daily-chart" : ""}`}
            role="region"
            aria-label={`${period} spending chart${period === "Daily" ? ". Scroll horizontally to see every date." : ""}`}
            tabIndex={period === "Daily" ? 0 : undefined}
          >
            {monthlyExpenses.length ? <>
              <div className="daily-chart-track" style={period === "Daily" ? undefined : { display: "contents" }}>
                <svg viewBox="0 0 1000 190" preserveAspectRatio="none" role="img" aria-label={`${period} spending bar chart`}>
                  <g className="trend-bars">{chartTotals.map((amount, index) => {
                    const x = period === "Daily"
                      ? getDailyBarX(index, chartTotals.length, isMobile)
                      : getWeeklyBarX(index, chartTotals.length, isMobile);
                    const barWidth = period === "Daily"
                      ? Math.min(22, (isMobile ? 952 : 972) / chartTotals.length * 0.68)
                      : Math.min(92, 890 / chartTotals.length * 0.55);
                    const barHeight = (amount / chartMax) * 120;
                    return amount > 0 ? <rect key={index} x={x - barWidth / 2} y={164 - barHeight} width={barWidth} height={barHeight} rx="3"><title>{period} {index + 1}: {formatRupees(amount)}</title></rect> : null;
                  })}</g>
                </svg>
                {period === "Weekly" ? <>
                  <div className="trend-value-labels">{weeklyTotals.map((amount, index) => <span key={index} style={{ left: `${getBarCenterPercent(index, weeklyTotals.length, isMobile)}%` }}>{formatRupees(amount)}</span>)}</div>
                  <span
                    className={`trend-highest ${highestWeeklyIndex === 0 ? "first-week" : highestWeeklyIndex === weeklyTotals.length - 1 ? "last-week" : ""}`}
                    style={{ left: `${getBarCenterPercent(highestWeeklyIndex, weeklyTotals.length, isMobile)}%` }}
                  >
                    HIGHEST
                  </span>
                  <div className="trend-week-labels">{weeklyTotals.map((_, index) => <span key={index} style={{ left: `${getBarCenterPercent(index, weeklyTotals.length, isMobile)}%` }}>Week {index + 1}</span>)}</div>
                </> : <>
                  <div className="trend-value-labels trend-daily-summary">Peak {formatRupees(dailyPeak)} on day {dailyPeakDay}</div>
                  <div className="trend-week-labels daily-ticks">{dailyTickDays.map((day, index) => <span className={day === 1 || day % 5 === 0 || day === daysInMonth ? "daily-tick daily-tick-major" : "daily-tick"} key={day} style={{ left: `${getDailyBarCenterPercent(index, dailyTickDays.length, isMobile)}%` }}>{day}</span>)}</div>
                </>}
              </div>
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
                  <span className="dashboard-category-icon"><img src={item.type === "Client" ? clientIcon : employeeIcon} alt="" /></span>
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
              <div className="insight-mark"><img src={monthlyInsightIcon} alt="" /></div>
              <p>{monthlyExpenses.length ? `Monthly Insight: You've recorded ${monthlyExpenses.length} expenses across ${clients} clients, ${employees} employees and company operations.` : "Monthly Insight: Your spending summary will appear here once expenses are recorded."}</p>
            </div>
            <span className="insight-orb" />
          </section>
        </div>

        <section className="dashboard-analytics-grid">
          <article className="dashboard-analytics-card panel">
            <div className="dashboard-panel-heading">
              <h2>Who are we spending for?</h2>
              <Link to="/analytics" className="dashboard-link"><span className="dashboard-link-full">View Breakdown</span><span className="dashboard-link-mobile">View</span></Link>
            </div>
            <div className="dashboard-breakdown-list">
              {byWho.slice(0, 4).map((item, index) => <BreakdownRow key={item.name} label={item.name === "Client" ? "Clients" : item.name === "Employee" ? "Employees" : item.name} amount={item.amount} total={total} rank={index} />)}
              {byWho.length === 0 && <p className="dashboard-empty">Spending breakdown will appear when expenses are added.</p>}
            </div>
          </article>
          <article className="dashboard-analytics-card panel">
            <div className="dashboard-panel-heading">
              <h2>What are we spending on?</h2>
              <Link to="/analytics" className="dashboard-link"><span className="dashboard-link-full">View All Categories</span><span className="dashboard-link-mobile">View</span></Link>
            </div>
            <div className="dashboard-category-list">
              {byCategory.slice(0, 6).map((item, index) => <BreakdownRow key={item.name} label={item.name} amount={item.amount} total={total} compact rank={index} opacityStep={10} />)}
              {byCategory.length === 0 && <p className="dashboard-empty">Category breakdown will appear when expenses are added.</p>}
            </div>
          </article>
        </section>

        <section className="dashboard-documents panel">
          <div className="dashboard-doc-title"><h2>Documentation Status</h2></div>
          <div className="document-status-grid" role="region" aria-label="Documentation status details" tabIndex={0}>
            <article className="document-status-card">
              <img src={verifiedStatusIcon} alt="" />
              <div><strong>{attached} Bills Attached</strong><small>Verified documentation</small></div>
            </article>
            <article className="document-status-card missing">
              <img src={missingStatusIcon} alt="" />
              <div><strong>{missing} Bills Missing</strong><small>Action required</small></div>
            </article>
            <article className="document-status-card">
              <img src={reviewStatusIcon} alt="" />
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
                  <tr key={expense.id} onClick={() => navigate(`/expenses/${encodeURIComponent(expense.id)}`)}>
                    <td>{formatDate(expense.date)}</td>
                    <td><strong>{expense.paidFor}</strong></td>
                    <td><span className="dashboard-type-pill">{expense.paidForType}</span></td>
                    <td>{expense.purpose}</td>
                    <td><img className="bill-status-icon" src={expense.receipt ? billAttachedIcon : billMissingIcon} alt={expense.receipt ? "Bill attached" : "Bill missing"} /></td>
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
          <div><span>{monthName.toUpperCase()} {year} SUMMARY</span><strong><span>{formatRupees(total)}</span><i>•</i><span>{monthlyExpenses.length} Entries</span><i>•</i><span className="dashboard-summary-missing">{missing} Missing Bills</span></strong></div>
          <button className="dashboard-report-button" onClick={() => void downloadDashboardPdf()} disabled={exportingPdf}><Download size={16} /> {exportingPdf ? "Creating PDF…" : "Download Full Report"}</button>
        </footer>
      </div>
      <footer className="dashboard-page-footer">
        <span>© 2026 Internal Expense. Discover. Build. Share. Innovate.</span>
        <strong>POWERED BY DESFLYER</strong>
      </footer>
      {toast}
    </div>
  );
}

function BreakdownRow({
  label,
  amount,
  total,
  compact = false,
  rank = 0,
  opacityStep = 15,
}: {
  label: string;
  amount: number;
  total: number;
  compact?: boolean;
  rank?: number;
  opacityStep?: number;
}) {
  const share = total ? Math.round((amount / total) * 100) : 0;
  const opacity = Math.max(0, 100 - rank * opacityStep) / 100;
  return (
    <div className={`breakdown-row ${compact ? "compact" : ""}`}>
      <div className="breakdown-labels"><span>{label}</span><strong>{formatRupees(amount)}{compact ? "" : ` (${share}%)`}</strong></div>
      <div className="breakdown-track"><span style={{ width: `${share}%`, opacity }} /></div>
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

function getBarCenterPercent(index: number, count: number, isMobile: boolean) {
  const x = getWeeklyBarX(index, count, isMobile);
  return 2 + (x / 1000) * 96;
}

function getWeeklyBarX(index: number, count: number, isMobile: boolean) {
  if (!isMobile) return 80 + (index / Math.max(count - 1, 1)) * 840;
  if (index === 0) return 80;
  if (index === count - 1) return 920;
  return 24 + (index / Math.max(count - 1, 1)) * 952;
}

function getDailyBarX(index: number, count: number, isMobile: boolean) {
  const start = isMobile ? 16 : 14;
  const range = isMobile ? 952 : 972;
  return start + (index / Math.max(count - 1, 1)) * range;
}

function getDailyBarCenterPercent(index: number, count: number, isMobile: boolean) {
  const x = getDailyBarX(index, count, isMobile);
  return isMobile ? x / 10 : 2 + (x / 1000) * 96;
}

