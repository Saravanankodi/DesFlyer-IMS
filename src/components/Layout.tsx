import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  ChevronDown,
  CircleHelp,
  FileText,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  Wallet,
  X,
} from "lucide-react";
import { useExpenses } from "../store";
import { downloadExpensesCsv } from "../data/expenses";

const navigation = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Add Expense", path: "/expenses/new", icon: Plus },
  { label: "Expense Records", path: "/expenses", icon: FileText },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
];

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
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
      ? "Transaction Details"
      : "Internal Expense");

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">
            <Wallet size={19} />
          </span>
          <span>
            <strong>DesFlyer</strong>
            <small>Internal Expense</small>
          </span>
          <button
            className="icon-button mobile-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="side-nav">
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
              onClick={() => setMenuOpen(false)}
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
                "Settings are managed by your Finance administrator in this demo.",
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
              <strong>Admin User</strong>
              <small>Finance Dept.</small>
            </span>
            <ChevronDown size={15} />
          </div>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <main className="main-area">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <span className="topbar-title">{title}</span>
          <div className="topbar-actions">
            <label className="global-search">
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
            </label>
            <button
              className="icon-button topbar-icon"
              aria-label="Notifications"
              onClick={() => setNotice("You are all caught up.")}
            >
              <Bell size={18} />
              <i />
            </button>
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
