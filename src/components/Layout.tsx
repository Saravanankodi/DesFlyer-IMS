import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  FileText,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { useExpenses } from "../store";
import { downloadExpensesCsv } from "../data/expenses";
import brandLogo from "../assets/desflyer-logo.png";

const navigation = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Add Expense", path: "/expenses/new", icon: Plus },
  { label: "Expense Records", path: "/expenses", icon: FileText },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
];

export function Layout() {
  const [notice, setNotice] = useState("");
  const [headerSearch, setHeaderSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { expenses } = useExpenses();
  useEffect(() => {
    const syncHeaderSearch = (event: Event) =>
      setHeaderSearch((event as CustomEvent<string>).detail);
    window.addEventListener("expense-search", syncHeaderSearch);
    return () => window.removeEventListener("expense-search", syncHeaderSearch);
  }, []);
  const title =
    (location.pathname.endsWith("/edit") ? "Edit Expense" : undefined) ??
    navigation.find((item) => item.path === location.pathname)?.label ??
    (location.pathname.includes("/expenses/")
      ? "Expense Records"
      : "Internal Expense");
  const isTransactionRoute = /^\/expenses\/[^/]+(?:\/edit)?$/.test(location.pathname) && !location.pathname.endsWith("/new");
  const topbarAddAction = ["/expenses", "/analytics"].includes(location.pathname) || isTransactionRoute;
  const showCalendar = topbarAddAction || location.pathname === "/expenses/new";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span>
            <img className="brand-logo" src={brandLogo} alt="DesFlyer" />
            <small>Internal Expense</small>
          </span>
        </div>
        <nav className="side-nav">
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <NavLink className="new-report" to="/analytics">
          <Plus size={17} /> New Report
        </NavLink>
        <div className="sidebar-bottom">
          <button
            className="bottom-link"
            onClick={() =>
              setNotice(
                "Settings are managed by your Finance administrator.",
              )
            }
          >
            <Settings size={17} />
            Settings
          </button>
          <button
            className="bottom-link"
            onClick={() =>
              setNotice("For help, contact your Finance administrator.")
            }
          >
            <CircleHelp size={17} />
            Help / Support
          </button>
          <div className="profile">
            <span className="avatar">AU</span>
            <span>
              <strong>Current User</strong>
              <small>Finance Dept.</small>
            </span>
            <ChevronDown size={15} />
          </div>
        </div>
      </aside>
      <main className="main-area">
        <div className="mobile-brand"><img src={brandLogo} alt="DesFlyer" /><span>Internal Expense</span></div>
        <header className="topbar">
          <span className="topbar-title">{title}</span>
          <div className="topbar-actions">
            {topbarAddAction && <NavLink className="button button-primary topbar-add-expense" to="/expenses/new"><Plus size={16} /> Add Expense</NavLink>}
            {topbarAddAction && <span className="topbar-month"><CalendarDays size={15} /> July 2026</span>}
            {!topbarAddAction && <label className="global-search">
              <Search size={16} />
              <input
                placeholder="Search expenses..."
                aria-label="Search expenses"
                value={headerSearch}
                onChange={(event) => {
                  setHeaderSearch(event.target.value);
                  window.dispatchEvent(
                    new CustomEvent("expense-search", {
                      detail: event.target.value,
                    }),
                  );
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && headerSearch.trim()) {
                    navigate(
                      `/expenses?search=${encodeURIComponent(headerSearch.trim())}`,
                    );
                  }
                }}
              />
            </label>}
            <button
              className="icon-button topbar-icon"
              aria-label="Notifications"
              onClick={() => setNotice("You are all caught up.")}
            >
              <Bell size={18} />
              <i />
            </button>
            {showCalendar && <button className="icon-button topbar-icon" aria-label="Calendar" onClick={() => setNotice("Choose a month from the page filters.")}><CalendarDays size={18} /></button>}
            <button
              className="button button-outline top-report"
              onClick={() => downloadExpensesCsv(expenses)}
            >
              <FileText size={15} />
              Download Report
            </button>
          </div>
        </header>
        <div className="page-area">
          <Outlet />
        </div>
        <footer className="site-footer">
          <span>
            © 2026 Internal Expense. Discover. Build. Share. Innovate.
          </span>
          <strong>POWERED BY DESFLYER</strong>
        </footer>
        <nav className="mobile-bottom-nav" aria-label="Main navigation">
          {navigation.map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} end={path === "/"} aria-label={label} className={({ isActive }) => isActive ? "active" : ""}><Icon size={21} /></NavLink>)}
        </nav>
        {notice && (
          <div role="status" className="toast">
            <span className="toast-check">✓</span>
            {notice}
            <button
              onClick={() => setNotice("")}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
