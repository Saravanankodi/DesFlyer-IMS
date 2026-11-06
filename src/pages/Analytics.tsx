import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { ArrowDownRight, ArrowUpRight, CalendarDays, Download, Eye } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { MonthPicker } from "../components/MonthPicker";
import { FilterDropdown, useToast } from "../components/Shared";
import { formatDate, formatRupees } from "../data/expenses";
import { useExpenses } from "../store";
import type { Expense } from "../types";
import clientIcon from "../assets/dashboard-client-icon.jpg";
import employeeIcon from "../assets/dashboard-employee-icon.jpg";

const chartColors = ["#1677ff", "#dc2626", "#16a34a", "#f59e0b", "#0057c2", "#9bb7ff"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function categoryColor(name: string, index: number) {
  const value = name.toLowerCase();
  if (value.includes("hardware")) return "#1677ff";
  if (value.includes("travel") || value.includes("petrol")) return "#dc2626";
  if (value.includes("software") || value.includes("cloud")) return "#16a34a";
  if (value.includes("other")) return "#f59e0b";
  if (value.includes("food") || value.includes("meeting")) return "#f97316";
  return chartColors[index % chartColors.length];
}

function categoryTone(name: string) {
  const value = name.toLowerCase();
  if (value.includes("hardware")) return "hardware";
  if (value.includes("travel") || value.includes("petrol")) return "travel";
  if (value.includes("software") || value.includes("cloud")) return "software";
  if (value.includes("other")) return "other";
  if (value.includes("food") || value.includes("meeting")) return "food";
  return "default";
}

function nameInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length > 1
    ? words.slice(0, 2).map((word) => word[0]).join("").toUpperCase()
    : (words[0] ?? "?").slice(0, 2).toUpperCase();
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatSyncAge(lastSyncedAt: number | null, now: number, hasError: boolean) {
  if (hasError) return "Data sync unavailable";
  if (!lastSyncedAt) return "Data sync pending";
  const minutes = Math.floor(Math.max(0, now - lastSyncedAt) / 60_000);
  if (minutes < 1) return "Data sync: just now";
  if (minutes < 60) return `Data sync: ${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  return `Data sync: ${hours} hr${hours === 1 ? "" : "s"} ago`;
}

function groupByAmount(expenses: Expense[], key: "paidForType" | "paidFor") {
  const totals = new Map<string, number>();
  expenses.forEach((expense) => totals.set(key === "paidForType" ? expense.paidForType : expense.paidFor, (totals.get(key === "paidForType" ? expense.paidForType : expense.paidFor) ?? 0) + expense.amount));
  return [...totals].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
}

export function Analytics() {
  const { expenses, lastSyncedAt, syncError } = useExpenses();
  const navigate = useNavigate();
  const { showToast, toast } = useToast();
  const analyticsPageRef = useRef<HTMLDivElement>(null);
  const [syncClock, setSyncClock] = useState(Date.now());
  const [exportingPdf, setExportingPdf] = useState(false);
  useEffect(() => {
    const interval = window.setInterval(() => setSyncClock(Date.now()), 15_000);
    return () => window.clearInterval(interval);
  }, []);
  const today = new Date();
  const currentPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [period, setPeriod] = useState(currentPeriod);
  const [rangeStartDate, setRangeStartDate] = useState(`${today.getFullYear()}-01-01`);
  const [rangeEndDate, setRangeEndDate] = useState(toDateKey(today));
  const [department, setDepartment] = useState("All Departments");
  const [employee, setEmployee] = useState("All Employees");
  const [client, setClient] = useState("All Clients");
  const [category, setCategory] = useState("Category: All");
  const [status, setStatus] = useState("Status: All");
  const [trendPeriod, setTrendPeriod] = useState<"Monthly" | "Weekly" | "Yearly">("Monthly");
  const [categoryWeek, setCategoryWeek] = useState(0);
  const [year] = period.split("-");
  const rangeStart = new Date(`${rangeStartDate}T00:00:00`);
  const rangeEnd = new Date(`${rangeEndDate}T00:00:00`);
  const budgetLimit = 1_000_000;
  const rangeDays = Math.max(1, Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000) + 1);
  const periodLabel = new Date(`${period}-01T00:00:00`).toLocaleDateString("en", { month: "long", year: "numeric" });
  const departments = [...new Set(expenses.map((item) => item.department).filter((value): value is string => Boolean(value)))].sort();
  const employees = [...new Set(expenses.filter((item) => item.paidForType === "Employee").map((item) => item.paidFor))].sort();
  const clients = [...new Set(expenses.filter((item) => item.paidForType === "Client").map((item) => item.paidFor))].sort();
  const categories = [...new Set(expenses.map((item) => item.category))].sort();
  const filteredByFilters = useMemo(
    () => expenses.filter((item) => {
      if (department !== "All Departments" && item.department !== department) return false;
      if (employee !== "All Employees" && (item.paidForType !== "Employee" || item.paidFor !== employee)) return false;
      if (client !== "All Clients" && (item.paidForType !== "Client" || item.paidFor !== client)) return false;
      if (category !== "Category: All" && item.category !== category) return false;
      if (status !== "Status: All" && item.status !== (status === "Status: Approved" ? "Verified" : status.replace("Status: ", ""))) return false;
      return true;
    }),
    [expenses, department, employee, client, category, status],
  );
  const filtered = filteredByFilters.filter((item) => item.date >= rangeStartDate && item.date <= rangeEndDate);
  const approvalDurations = filtered.flatMap((item) => {
    if (item.status !== "Verified" || !item.submittedAt || !item.approvedAt) return [];
    const submittedAt = Date.parse(item.submittedAt);
    const approvedAt = Date.parse(item.approvedAt);
    return Number.isFinite(submittedAt) && Number.isFinite(approvedAt) && approvedAt >= submittedAt
      ? [(approvedAt - submittedAt) / 3_600_000]
      : [];
  });
  const approvalVelocity = approvalDurations.length
    ? `${(approvalDurations.reduce((sum, hours) => sum + hours, 0) / approvalDurations.length).toFixed(1)} Hours`
    : null;
  const selectedMonthExpenses = filtered.filter((item) => item.date.startsWith(`${period}-`));
  const total = filtered.reduce((sum, item) => sum + item.amount, 0);
  const selectedYear = Number(year);
  const selectedMonthTotal = selectedMonthExpenses.reduce((sum, item) => sum + item.amount, 0);
  const selectedYearExpenses = filteredByFilters.filter((item) => item.date.startsWith(`${selectedYear}-`));
  const overviewExpenses = trendPeriod === "Monthly" ? selectedMonthExpenses : filtered;
  const overviewTotal = trendPeriod === "Monthly" ? selectedMonthTotal : total;
  const previousMonthDate = new Date(`${period}-01T00:00:00`);
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousPeriod = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const previousMonthExpenses = filteredByFilters.filter((item) => item.date.startsWith(`${previousPeriod}-`));
  const previousRangeEnd = new Date(rangeStart);
  previousRangeEnd.setDate(previousRangeEnd.getDate() - 1);
  const previousRangeStart = new Date(previousRangeEnd);
  previousRangeStart.setDate(previousRangeStart.getDate() - rangeDays + 1);
  const previousTotal = filteredByFilters
    .filter((item) => item.date >= toDateKey(previousRangeStart) && item.date <= toDateKey(previousRangeEnd))
    .reduce((sum, item) => sum + item.amount, 0);
  const overviewPreviousTotal = previousTotal;
  const changePercent = overviewPreviousTotal > 0 ? ((overviewTotal - overviewPreviousTotal) / overviewPreviousTotal) * 100 : null;
  const people = new Set(overviewExpenses.map((item) => item.paidFor)).size;
  const priorPeriodDate = new Date(`${period}-01T00:00:00`);
  priorPeriodDate.setMonth(priorPeriodDate.getMonth() - 1);
  const priorPeriod = `${priorPeriodDate.getFullYear()}-${String(priorPeriodDate.getMonth() + 1).padStart(2, "0")}`;
  const daysInSelectedMonth = new Date(selectedYear, Number(period.slice(5, 7)), 0).getDate();
  const weeksInSelectedMonth = 4;
  const activeCategoryWeek = Math.min(categoryWeek, 3);
  const chartLabels = trendPeriod === "Monthly"
    ? months
    : trendPeriod === "Weekly"
      ? Array.from({ length: weeksInSelectedMonth }, (_, index) => `Week ${index + 1}`)
      : Array.from({ length: 5 }, (_, index) => String(selectedYear - 4 + index));
  const currentChartValues = trendPeriod === "Monthly"
    ? chartLabels.map((_, index) => selectedYearExpenses
      .filter((expense) => new Date(`${expense.date}T00:00:00`).getMonth() === index)
      .reduce((sum, expense) => sum + expense.amount, 0))
    : trendPeriod === "Weekly"
      ? Array.from({ length: weeksInSelectedMonth }, (_, week) => selectedMonthExpenses
        .filter((expense) => Math.min(3, Math.floor((new Date(`${expense.date}T00:00:00`).getDate() - 1) / 7)) === week)
        .reduce((sum, expense) => sum + expense.amount, 0))
      : chartLabels.map((label) => filtered
        .filter((expense) => expense.date.startsWith(`${label}-`))
        .reduce((sum, expense) => sum + expense.amount, 0));
  const priorYear = selectedYear - 1;
  const previousChartValues = trendPeriod === "Monthly"
    ? chartLabels.map((_, index) => index === previousMonthDate.getMonth()
      ? previousMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
      : 0)
    : trendPeriod === "Weekly"
      ? Array.from({ length: weeksInSelectedMonth }, (_, week) => filteredByFilters
        .filter((expense) => expense.date.startsWith(`${priorPeriod}-`) && Math.min(3, Math.floor((new Date(`${expense.date}T00:00:00`).getDate() - 1) / 7)) === week)
        .reduce((sum, expense) => sum + expense.amount, 0))
      : chartLabels.map((label) => filteredByFilters
        .filter((expense) => expense.date.startsWith(`${Number(label) - 1}-`))
        .reduce((sum, expense) => sum + expense.amount, 0));
  const chartMax = Math.max(...currentChartValues, ...previousChartValues, 1);
  const chartX = (index: number) => chartLabels.length === 1 ? 350 : 34 + index * (660 / (chartLabels.length - 1));
  const chartY = (amount: number) => 235 - (amount / chartMax) * 190;
  const currentLineValues = trendPeriod === "Monthly"
    ? chartLabels.map((_, index) => index === Number(period.slice(5, 7)) - 1 ? selectedMonthTotal : 0)
    : currentChartValues;
  const smoothLinePath = (values: number[]) => {
    const points = values.map((amount, index) => ({ x: chartX(index), y: chartY(amount) }));
    if (!points.length) return "";
    return points.reduce((path, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const previous = points[index - 1];
      const beforePrevious = points[index - 2] ?? previous;
      const next = points[index + 1] ?? point;
      const minY = Math.min(previous.y, point.y);
      const maxY = Math.max(previous.y, point.y);
      const clampY = (value: number) => Math.max(minY, Math.min(maxY, value));
      const control1X = previous.x + (point.x - beforePrevious.x) / 6;
      const control1Y = clampY(previous.y + (point.y - beforePrevious.y) / 6);
      const control2X = point.x - (next.x - previous.x) / 6;
      const control2Y = clampY(point.y - (next.y - previous.y) / 6);
      return `${path} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${point.x} ${point.y}`;
    }, "");
  };
  const currentPath = smoothLinePath(currentLineValues);
  const previousPath = trendPeriod === "Monthly" && previousMonthExpenses.length === 0 ? "" : smoothLinePath(previousChartValues);
  const categorySource = trendPeriod === "Monthly"
    ? filtered
    : trendPeriod === "Weekly"
      ? selectedMonthExpenses.filter((expense) => Math.min(3, Math.floor((new Date(`${expense.date}T00:00:00`).getDate() - 1) / 7)) === activeCategoryWeek)
      : filtered;
  const categoryTotal = categorySource.reduce((sum, item) => sum + item.amount, 0);
  const categoryTotals = [...new Set(categorySource.map((item) => item.category))].map((name) => ({
    name,
    amount: categorySource.filter((item) => item.category === name).reduce((sum, item) => sum + item.amount, 0),
  })).sort((a, b) => b.amount - a.amount);
  let gradientOffset = 0;
  const donutGradient = categoryTotals.length
    ? `conic-gradient(${categoryTotals.map((item, index) => {
      const start = gradientOffset;
      gradientOffset += categoryTotal ? (item.amount / categoryTotal) * 100 : 0;
      return `${categoryColor(item.name, index)} ${start}% ${gradientOffset}%`;
    }).join(", ")})`
    : "conic-gradient(#e9edff 0% 100%)";
  const recipientTypeNames: Record<string, string> = { Client: "Clients (Project Expenses)", Employee: "Employees", "Company / Office": "Office Operations", Other: "Others" };
  const byRecipient = groupByAmount(filtered, "paidForType").map((item) => ({ ...item, name: recipientTypeNames[item.name] ?? item.name }));
  const highestExpenses = [...filtered].sort((a, b) => b.amount - a.amount).slice(0, 10);
  const typeTotals = groupByAmount(filtered, "paidForType");
  const maxTypeAmount = Math.max(...typeTotals.map((item) => item.amount), 1);
  const withExpenseCounts = (items: Expense[]) => groupByAmount(items, "paidFor").map((item) => ({
    ...item,
    count: items.filter((expense) => expense.paidFor === item.name).length,
    department: items.find((expense) => expense.paidFor === item.name)?.department ?? "",
  }));
  const topEmployees = withExpenseCounts(filtered.filter((item) => item.paidForType === "Employee")).slice(0, 2);
  const topClients = withExpenseCounts(filtered.filter((item) => item.paidForType === "Client")).slice(0, 2);
  const departmentTotals = [...filtered.reduce((totals, item) => {
    if (item.department) totals.set(item.department, (totals.get(item.department) ?? 0) + item.amount);
    return totals;
  }, new Map<string, number>())].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 4);
  const dailyTotals = [...filtered.reduce((totals, item) => {
    totals.set(item.date, (totals.get(item.date) ?? 0) + item.amount);
    return totals;
  }, new Map<string, number>())].sort((a, b) => b[1] - a[1]);
  const peakSpendingDay = dailyTotals[0]?.[0];
  const averageDailyBurn = total / rangeDays;
  const trendHasData = currentChartValues.some(Boolean) || previousChartValues.some(Boolean);
  const updateFilter = (setter: (value: string) => void) => (value: string) => setter(value);
  const changeRangeStart = (value: string) => {
    if (!value) return;
    setRangeStartDate(value);
    if (value > rangeEndDate) setRangeEndDate(value);
  };
  const changeRangeEnd = (value: string) => {
    if (!value) return;
    setRangeEndDate(value);
    if (value < rangeStartDate) setRangeStartDate(value);
  };
  const changePeriod = (value: string) => {
    const [selectedYear, selectedMonth] = value.split("-").map(Number);
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    setPeriod(value);
    setRangeStartDate(`${value}-01`);
    setRangeEndDate(`${value}-${String(lastDay).padStart(2, "0")}`);
  };
  const exportAnalyticsPdf = async () => {
    if (!analyticsPageRef.current || exportingPdf) return;
    setExportingPdf(true);
    try {
      const source = analyticsPageRef.current;
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
          clonedElement.querySelector(".analytics-export")?.remove();
          const donut = clonedElement.querySelector<HTMLElement>(".analytics-donut");
          if (donut && categoryTotal > 0) {
            const cloneDocument = clonedElement.ownerDocument;
            const svgNamespace = "http://www.w3.org/2000/svg";
            const svg = cloneDocument.createElementNS(svgNamespace, "svg");
            const radius = 63;
            const circumference = 2 * Math.PI * radius;
            let offset = 0;
            svg.setAttribute("viewBox", "0 0 164 164");
            svg.setAttribute("aria-hidden", "true");
            Object.assign(svg.style, { position: "absolute", inset: "0", width: "100%", height: "100%" });
            categoryTotals.forEach((item, index) => {
              const segmentLength = circumference * item.amount / categoryTotal;
              const segment = cloneDocument.createElementNS(svgNamespace, "circle");
              segment.setAttribute("cx", "82");
              segment.setAttribute("cy", "82");
              segment.setAttribute("r", String(radius));
              segment.setAttribute("fill", "none");
              segment.setAttribute("stroke", categoryColor(item.name, index));
              segment.setAttribute("stroke-width", "38");
              segment.setAttribute("stroke-dasharray", `${segmentLength} ${circumference - segmentLength}`);
              segment.setAttribute("stroke-dashoffset", String(-offset));
              svg.appendChild(segment);
              offset += segmentLength;
            });
            donut.style.background = "none";
            donut.style.position = "relative";
            donut.insertBefore(svg, donut.firstChild);
            const center = donut.querySelector<HTMLElement>(":scope > div");
            if (center) Object.assign(center.style, { position: "relative", zIndex: "1" });
          }
          clonedElement.querySelectorAll<HTMLElement>(".analytics-table-wrap").forEach((tableWrap) => {
            tableWrap.style.maxHeight = "none";
            tableWrap.style.height = "auto";
            tableWrap.style.overflow = "visible";
          });
          clonedElement.querySelectorAll(".analytics-table tr").forEach((row) => row.lastElementChild?.remove());
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
      pdf.save(`expense-analytics-${period}.pdf`);
    } catch (error) {
      console.error("Failed to export analytics PDF", error);
      showToast("Could not create the analytics PDF. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <>
    <div className="analytics-page" ref={analyticsPageRef}>
      <header className="analytics-header">
        <div>
          <h1>Expense Analytics</h1>
          <p>Analyze company spending and financial performance across all departments.</p>
        </div>
        <div className="analytics-header-actions">
          <MonthPicker className="analytics-year-picker" label="Select analytics month and year" value={period} onChange={changePeriod} />
          <button className="button button-outline analytics-export" onClick={() => void exportAnalyticsPdf()} disabled={exportingPdf}>
            <Download size={14} /> {exportingPdf ? "Creating PDF…" : "Export PDF"}
          </button>
        </div>
      </header>

      <section className="analytics-filters" aria-label="Analytics filters">
        <FilterDropdown className="analytics-filter" label="Department" value={department} options={["All Departments", ...departments]} onChange={updateFilter(setDepartment)} />
        <FilterDropdown className="analytics-filter" label="Employee" value={employee} options={["All Employees", ...employees]} onChange={updateFilter(setEmployee)} />
        <FilterDropdown className="analytics-filter" label="Client" value={client} options={["All Clients", ...clients]} onChange={updateFilter(setClient)} />
        <FilterDropdown className="analytics-filter" label="Category" value={category} options={["Category: All", ...categories]} onChange={updateFilter(setCategory)} />
        <FilterDropdown className="analytics-filter" label="Status" value={status} options={["Status: All", "Status: Approved", "Status: Pending", "Status: Needs receipt"]} onChange={updateFilter(setStatus)} />
        <div className="analytics-date-range">
          <CalendarDays size={14} />
          <input type="date" aria-label="Range start date" value={rangeStartDate} max={rangeEndDate} onChange={(event) => changeRangeStart(event.target.value)} />
          <span>–</span>
          <input type="date" aria-label="Range end date" value={rangeEndDate} min={rangeStartDate} onChange={(event) => changeRangeEnd(event.target.value)} />
        </div>
      </section>

      <section className="analytics-overview" aria-label="Financial overview">
        <article className="analytics-kpi analytics-kpi-total">
          <span>Total Expenses</span><strong>{formatRupees(overviewTotal)}</strong><small>{trendPeriod === "Monthly" ? `Selected month (${periodLabel})` : "Selected range"}</small>
          {changePercent !== null ? (
            <em className={changePercent < 0 ? "analytics-change-down" : "analytics-change-up"}>
              {changePercent < 0 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />} {changePercent > 0 ? "+" : ""}{changePercent.toFixed(1)}% vs {trendPeriod === "Monthly" ? "previous month" : "previous range"}
            </em>
          ) : overviewTotal > 0 ? (
            <em className="analytics-change-up">New spending this {trendPeriod === "Monthly" ? "year" : "period"}</em>
          ) : (
            <em className="analytics-change-muted">No spending this {trendPeriod === "Monthly" ? "year" : "period"}</em>
          )}
        </article>
        <article className="analytics-kpi">
          <span>Expense Entries</span><strong>{overviewExpenses.length}</strong><small>{trendPeriod === "Monthly" ? `Selected month (${periodLabel})` : "Selected range"}</small>
        </article>
        <article className="analytics-kpi">
          <span>People/Clients</span><strong>{people}</strong><small>Active entities</small>
        </article>
      </section>

      <section className="analytics-chart-row">
        <article className="panel analytics-trend-panel">
          <div className="analytics-panel-heading"><h2>Monthly Expense Trend</h2><div className="analytics-trend-controls">{(["Monthly", "Weekly", "Yearly"] as const).map((item) => <button key={item} className={trendPeriod === item ? "selected" : ""} onClick={() => setTrendPeriod(item)}>{item}</button>)}</div></div>
          {trendHasData ? (
            <>
            <div className="analytics-line-chart">
              <div className="analytics-y-labels"><span>{formatRupees(chartMax)}</span><span>{formatRupees(chartMax / 2)}</span><span>₹0</span></div>
              <svg viewBox="0 0 700 260" role="img" aria-label={`${trendPeriod} spending trend for ${periodLabel}`} preserveAspectRatio="none">
                <g className="analytics-grid-lines"><line x1="30" y1="45" x2="690" y2="45"/><line x1="30" y1="140" x2="690" y2="140"/><line x1="30" y1="235" x2="690" y2="235"/></g>
                {currentChartValues.map((amount, index) => <rect key={`bar-${chartLabels[index]}`} x={chartX(index) - Math.min(20, 300 / chartLabels.length)} y={chartY(amount)} width={Math.min(40, 600 / chartLabels.length)} height={Math.max(2, 235 - chartY(amount))} rx="2" className={`analytics-chart-bar ${trendPeriod === "Monthly" && index === Number(period.slice(5, 7)) - 1 ? "selected-month" : ""}`}><title>{chartLabels[index]}: {formatRupees(amount)}</title></rect>)}
                <path className="analytics-current-line" d={currentPath} />
                <path className="analytics-previous-line" d={previousPath} />
              </svg>
              <div className="analytics-x-labels">{chartLabels.map((label) => <span key={label}>{label}</span>)}</div>
            </div>
            <div className="analytics-chart-legend"><span><i />Current Month</span><span><i />Previous Month</span></div>
            </>
          ) : <div className="analytics-empty">No expenses recorded for this {trendPeriod.toLowerCase()} view.</div>}
        </article>
        <article className="panel analytics-category-panel">
          <div className="analytics-panel-heading">
            <div><h2>Category Breakdown</h2><p>{trendPeriod === "Monthly" ? `Share of expenses in ${periodLabel}` : trendPeriod === "Weekly" ? `Week ${activeCategoryWeek + 1} of ${periodLabel}` : `Share of expenses in ${year}`}</p></div>
          </div>
          {trendPeriod === "Weekly" && <label className="analytics-category-week-select"><span>Week</span><select value={activeCategoryWeek} onChange={(event) => setCategoryWeek(Number(event.target.value))}>{Array.from({ length: weeksInSelectedMonth }, (_, index) => <option key={index} value={index}>Week {index + 1}</option>)}</select></label>}
          <div className={`analytics-donut-wrap ${trendPeriod === "Weekly" ? "weekly" : ""}`}>
            <div className="analytics-donut" style={{ background: donutGradient }}><div><strong>{formatRupees(categoryTotal)}</strong><span>Total spend</span></div></div>
          </div>
          <div className="analytics-category-legend">
            {categoryTotals.slice(0, 5).map((item, index) => <div key={item.name}><i style={{ background: categoryColor(item.name, index) }} /><span>{item.name}</span><strong>{categoryTotal ? Math.round(item.amount / categoryTotal * 100) : 0}%</strong></div>)}
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
            <div className="analytics-panel-heading"><h2>Monthly Budget Utilization</h2><span className={total > budgetLimit ? "budget-flag over" : "budget-flag"}>{total > budgetLimit ? "Over Budget" : "Within Budget"}</span></div>
            <div className="analytics-budget-labels"><strong>Actual Spending: {formatRupees(total)}</strong><span>Budget: {formatRupees(budgetLimit)}</span></div>
            <div className="analytics-budget-bar"><i style={{ width: `${Math.min(100, total / budgetLimit * 100)}%` }} /></div>
            <small>{total > budgetLimit ? `Exceeded by ${formatRupees(total - budgetLimit)} (${((total - budgetLimit) / budgetLimit * 100).toFixed(1)}% above cap)` : `${formatRupees(budgetLimit - total)} remaining in monthly cap`}</small>
          </article>
          <article className="panel analytics-department-card">
            <div className="analytics-panel-heading"><h2>Departmental Share</h2></div>
            <div className="analytics-department-grid">
              {departmentTotals.map((item, index) => <div className={`analytics-department-tile department-tone-${index + 1}`} key={item.name}><i>{item.name.slice(0, 2)}</i><span><strong>{item.name}</strong><small>{formatRupees(item.amount)} ({total ? Math.round(item.amount / total * 100) : 0}%)</small></span></div>)}
              {!departmentTotals.length && <div className="analytics-empty">Department totals will appear when expenses are added.</div>}
            </div>
          </article>
        </div>
      </section>

      <section className="analytics-table-leaderboards-row">
        <article className="panel analytics-top-expenses">
          <div className="analytics-table-heading"><h2><span className="analytics-desktop-expenses-title">Top 10 Highest Expenses</span><span className="analytics-mobile-expenses-title">Top 5 Highest Expenses</span></h2><Link to="/expenses">View All</Link></div>
          <div className="analytics-table-wrap">
            <table className="analytics-table">
              <thead><tr><th>RANK</th><th>EXPENSE NAME</th><th>CATEGORY</th><th>AMOUNT</th><th>DATE</th><th>ACTION</th></tr></thead>
              <tbody>
                {highestExpenses.map((expense, index) => <tr key={expense.id} onClick={() => navigate(`/expenses/${encodeURIComponent(expense.id)}`)}><td>#{index + 1}</td><td><strong>{expense.purpose}</strong></td><td><span className={`analytics-category-tag ${categoryTone(expense.category)}`}>{expense.category}</span></td><td><strong>{formatRupees(expense.amount)}</strong></td><td>{formatDate(expense.date)}</td><td><Link to={`/expenses/${encodeURIComponent(expense.id)}`} aria-label={`View ${expense.purpose}`}><Eye size={19} /></Link></td></tr>)}
                {!highestExpenses.length && <tr><td colSpan={6} className="analytics-empty-cell">No expenses recorded for the selected filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>
        <aside className="analytics-leaderboards" aria-label="Leaderboards">
          <article className="panel analytics-leaderboard-card">
            <h2><img className="analytics-leaderboard-heading-icon" src={employeeIcon} alt="" /> Top Expensive Employees</h2>
            <div className="analytics-leaderboard-list">
              {topEmployees.map((item) => <div className="analytics-leaderboard-entry employee-entry" key={item.name}><i className="analytics-employee-avatar"><img src={employeeIcon} alt="" /></i><div><strong>{item.name}</strong><small>{item.department || "Employee"}</small></div><b>{formatRupees(item.amount)}</b></div>)}
              {!topEmployees.length && <p className="analytics-empty-small">No employee data for this period.</p>}
            </div>
          </article>
          <article className="panel analytics-leaderboard-card analytics-most-frequent">
            <h2><img className="analytics-leaderboard-heading-icon" src={clientIcon} alt="" /> Top Expensive Clients</h2>
            <div className="analytics-leaderboard-list">
              {topClients.map((item) => <div className="analytics-leaderboard-entry client-entry" key={item.name}><i className="analytics-name-initials">{nameInitials(item.name)}</i><div><strong>{item.name}</strong><small>{item.count} Expenses</small></div><b>{formatRupees(item.amount)}</b></div>)}
              {!topClients.length && <p className="analytics-empty-small">No client data for this period.</p>}
            </div>
          </article>
        </aside>
      </section>

      <footer className="analytics-footer-summary">
        <div><span>PEAK SPENDING DAY</span><strong>{peakSpendingDay ? formatDate(peakSpendingDay) : "—"}</strong></div>
        <div><span>AVG DAILY BURN</span><strong>{formatRupees(averageDailyBurn)}</strong></div>
        <div><span>APPROVAL VELOCITY</span><strong title={approvalVelocity ? "Average time from submission to approval" : "Approval timing is tracked for new expenses going forward"}>{approvalVelocity ?? "Not tracked"}</strong></div>
        <div className="analytics-live-status">
          <span>{formatSyncAge(lastSyncedAt, syncClock, Boolean(syncError))}</span>
          <b className={syncError ? "sync-error" : ""}><i aria-hidden="true" />{syncError ? "Sync unavailable" : lastSyncedAt ? "Live System Monitoring" : "Connecting…"}</b>
        </div>
      </footer>
    </div>
    {toast}
    </>
  );
}
