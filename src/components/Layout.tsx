import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  CalendarDays,
  CircleHelp,
  CirclePlus,
  FileText,
  House,
  LayoutDashboard,
  LogOut,
  Plus,
  ReceiptText,
  Search,
  Settings,
} from "lucide-react";
import { useExpenses } from "../store";
import { useAuth } from "../auth";
import { downloadMonthlyExpenseReportPdf, formatDate, formatRupees } from "../data/expenses";
import { getCurrentMonthLabel } from "../data/dates";
import brandLogo from "../assets/desflyer-logo.png";

const navigation = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard, mobileIcon: House },
  { label: "Add Expense", path: "/expenses/new", icon: Plus, mobileIcon: CirclePlus },
  { label: "Expense Records", path: "/expenses", icon: FileText, mobileIcon: ReceiptText },
  { label: "Analytics", path: "/analytics", icon: BarChart3, mobileIcon: MobileAnalyticsIcon },
];

function MobileAnalyticsIcon({ size = 21, strokeWidth = 1.8 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
      <path d="M7.5 16.5v-3m4 3V8.5m4 8v-5" />
    </svg>
  );
}

export function Layout() {
  const [notice, setNotice] = useState("");
  const [headerSearch, setHeaderSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { expenses, refreshExpenses } = useExpenses();
  const { email, isAdmin, signOut } = useAuth();
  useEffect(() => {
    if (!isAdmin) return;
    const interval = window.setInterval(() => { void refreshExpenses(); }, 15_000);
    return () => window.clearInterval(interval);
  }, [isAdmin, refreshExpenses]);
  useEffect(() => {
    const syncHeaderSearch = (event: Event) =>
      setHeaderSearch((event as CustomEvent<string>).detail);
    window.addEventListener("expense-search", syncHeaderSearch);
    return () => window.removeEventListener("expense-search", syncHeaderSearch);
  }, []);
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.querySelector(".main-area")?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.querySelector(".page-area")?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);
  useEffect(() => {
    if (!notificationsOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!notificationRef.current?.contains(event.target as Node)) setNotificationsOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [notificationsOpen]);
  const notifications = expenses.flatMap((expense) => {
    if (isAdmin) {
      if (expense.createdByRole !== "employee" || expense.status !== "Pending") return [];
      const submitter = expense.createdByName || "an employee";
      return [{ id: expense.id, title: `New expense submitted by ${submitter}`, expense }];
    }
    const title = !expense.receipt || expense.status === "Needs receipt"
      ? "Receipt needs attention"
      : expense.status === "Pending"
        ? "Expense awaiting review"
        : "";
    return title ? [{ id: expense.id, title, expense }] : [];
  });
  const unreadNotifications = notifications.filter(({ id }) => !readNotificationIds.includes(id)).length;
  const title =
    (location.pathname.endsWith("/edit") ? "Edit Expense" : undefined) ??
    navigation.find((item) => item.path === location.pathname)?.label ??
    (location.pathname.includes("/expenses/")
      ? "Expense Records"
      : "Internal Expense");
  const isDashboardRoute = location.pathname === "/";
  const isTransactionRoute = /^\/expenses\/[^/]+(?:\/edit)?$/.test(location.pathname) && !location.pathname.endsWith("/new");
  const topbarAddAction = ["/expenses", "/analytics"].includes(location.pathname) || isTransactionRoute;

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
              end={path === "/" || path === "/expenses"}
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
          <Plus size={18} /> New Report
        </NavLink>
        <div className="sidebar-bottom">
          {isAdmin && <NavLink className="bottom-link" to="/settings"><Settings size={18} />Settings</NavLink>}
          <button
            className="bottom-link"
            onClick={() =>
              setNotice("For help, contact your Finance administrator.")
            }
          >
            <CircleHelp size={18} />
            Help / Support
          </button>
          <div className="profile">
            <span className="avatar">{email?.slice(0, 2).toUpperCase() ?? "AU"}</span>
            <span>
              <strong>{email?.split("@")[0] ?? "Current User"}</strong>
              <small>{isAdmin ? "Administrator" : "Employee"}</small>
            </span>
            <button className="profile-logout" aria-label="Log out" title="Log out" onClick={() => { signOut(); navigate("/login", { replace: true }); }}><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <div className="mobile-brand"><img src={brandLogo} alt="DesFlyer" /><span>Internal Expense</span></div>
        <header className="topbar">
          <span className="topbar-title">{title}</span>
          <div className="topbar-actions">
            {topbarAddAction && <NavLink className="button button-primary topbar-add-expense" to="/expenses/new"><Plus size={16} /> Add Expense</NavLink>}
            {topbarAddAction && <span className="topbar-month"><CalendarDays size={15} /> {getCurrentMonthLabel()}</span>}
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
            <div className="notification-wrap" ref={notificationRef}>
              <button
                className="icon-button topbar-icon"
                type="button"
                aria-label={`Notifications${unreadNotifications ? ` (${unreadNotifications} unread)` : ""}`}
                aria-expanded={notificationsOpen}
                aria-controls="notifications-panel"
                onClick={() => setNotificationsOpen((open) => !open)}
              >
                <Bell size={18} />
                {unreadNotifications > 0 && <i />}
              </button>
              {notificationsOpen && <section className="notification-panel" id="notifications-panel" role="dialog" aria-label="Notifications">
                <header>
                  <strong>Notifications</strong>
                  {unreadNotifications > 0 && <button type="button" onClick={() => setReadNotificationIds(notifications.map(({ id }) => id))}>Mark all read</button>}
                </header>
                {notifications.length ? <div className="notification-list">{notifications.map(({ id, title: message, expense }) => (
                  <button className={`notification-item ${readNotificationIds.includes(id) ? "read" : ""}`} key={id} type="button" onClick={() => {
                    setReadNotificationIds((current) => current.includes(id) ? current : [...current, id]);
                    setNotificationsOpen(false);
                    navigate(`/expenses/${encodeURIComponent(expense.id)}`);
                  }}>
                    <span className="notification-unread-dot" />
                    <span><strong>{message}</strong><small>{expense.paidFor} · {formatRupees(expense.amount)} · {formatDate(expense.date)}</small></span>
                  </button>
                ))}</div> : <p className="notifications-empty">You’re all caught up.</p>}
              </section>}
            </div>
            <button
              className="button button-outline top-report"
              onClick={() => downloadMonthlyExpenseReportPdf(expenses)}
            >
              Download Report
            </button>
          </div>
        </header>
        <div className="page-area">
          <Outlet />
        </div>
        {!isDashboardRoute && <footer className="site-footer">
          <span>
            © 2026 Internal Expense. Discover. Build. Share. Innovate.
          </span>
          <strong>POWERED BY DESFLYER</strong>
        </footer>}
        <nav className="mobile-bottom-nav" aria-label="Main navigation">
          {navigation.map(({ label, path, mobileIcon: Icon }) => <NavLink key={path} to={path} end={path === "/" || path === "/expenses"} aria-label={label} className={({ isActive }) => isActive ? "active" : ""}><Icon size={23} strokeWidth={2} /></NavLink>)}
          {isAdmin && <NavLink to="/settings" aria-label="Settings" className={({ isActive }) => isActive ? "active" : ""}><Settings size={23} strokeWidth={2} /></NavLink>}
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
