import { useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDate, formatRupees } from "../data/expenses";
import { useExpenses } from "../store";
import { useAuth } from "../auth";

export function MobileDashboardNotifications() {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { expenses } = useExpenses();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
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
  const unreadCount = notifications.filter(({ id }) => !readIds.includes(id)).length;
  const togglePanel = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const panelWidth = Math.min(360, window.innerWidth - 32);
      const panelHeight = Math.min(420, window.innerHeight - 24);
      setPanelPosition({
        top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - panelHeight - 12)),
        left: Math.max(16, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 16)),
      });
    }
    setOpen(true);
  };

  return (
    <div className="dashboard-mobile-notifications">
      <button
        ref={buttonRef}
        className="dashboard-mobile-notifications-button"
        type="button"
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        onClick={togglePanel}
      >
        <Bell size={17} />
        {unreadCount > 0 && <i />}
      </button>
      {open && <section className="notification-panel dashboard-mobile-notification-panel" style={panelPosition} role="dialog" aria-label="Notifications">
        <header>
          <strong>Notifications</strong>
          {unreadCount > 0 && <button type="button" onClick={() => setReadIds(notifications.map(({ id }) => id))}>Mark all read</button>}
        </header>
        {notifications.length ? <div className="notification-list">{notifications.map(({ id, title, expense }) => (
          <button className={`notification-item ${readIds.includes(id) ? "read" : ""}`} key={id} type="button" onClick={() => {
            setReadIds((current) => current.includes(id) ? current : [...current, id]);
            setOpen(false);
            navigate(`/expenses/${encodeURIComponent(expense.id)}`);
          }}>
            <span className="notification-unread-dot" />
            <span><strong>{title}</strong><small>{expense.paidFor} · {formatRupees(expense.amount)} · {formatDate(expense.date)}</small></span>
          </button>
        ))}</div> : <p className="notifications-empty">You’re all caught up.</p>}
      </section>}
    </div>
  );
}
