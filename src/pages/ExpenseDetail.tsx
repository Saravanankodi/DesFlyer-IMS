import { useState } from "react";
import {
  Download,
  FileText,
  Pencil,
  Printer,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatDate, formatRupees } from "../data/expenses";
import { useExpenses } from "../store";
import { StatusBadge, useToast } from "../components/Shared";

export function ExpenseDetail() {
  const { id = "" } = useParams();
  const { expenses, updateExpense, deleteExpense } = useExpenses();
  const expense = expenses.find((item) => item.id === id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { showToast, toast } = useToast();
  const navigate = useNavigate();

  if (!expense)
    return (
      <section className="panel not-found">
        <h1>Expense not found</h1>
        <p>This expense may have been removed.</p>
        <Link className="button button-primary" to="/expenses">
          Return to records
        </Link>
      </section>
    );

  const markReviewed = () => {
    updateExpense(expense.id, { status: "Verified" });
    showToast("Expense marked as reviewed.");
  };
  const removeExpense = () => {
    deleteExpense(expense.id);
    navigate("/expenses", { state: { deleted: true } });
  };

  return (
    <>
      <div className="detail-page-heading">
        <Link className="detail-back" to="/expenses" aria-label="Back to expense records">←</Link>
        <div><h1>Transaction Details</h1><p>Complete expense information and supporting documents.</p></div>
        <Link className="button button-primary" to={`/expenses/${expense.id}/edit`}><Pencil size={15} /> Edit Expense</Link>
      </div>
      <div className="detail-workspace">
        <div className="detail-left-column">
          <section className="panel detail-summary-card">
            <div className="detail-summary-heading">
              <div className="detail-id">
              <div className="document-icon"><FileText size={22} /></div>
                <div>
                  <span>TRANSACTION ID</span>
                  <strong>{expense.id}</strong>
                </div>
              </div>
              <div className="detail-status-block">
                <StatusBadge status={expense.status} />
                <small>{formatDate(expense.date)}</small>
              </div>
            </div>
            <div className="detail-summary-values">
              <div><span>AMOUNT</span><strong>{formatRupees(expense.amount)}</strong></div>
              <div><span>PAYMENT METHOD</span><strong><FileText size={18} /> {expense.paymentMethod ?? "Bank Transfer"}</strong></div>
              <div><span>CREATED BY</span><strong>Current User</strong></div>
            </div>
          </section>
          <section className="panel info-panel">
            <h2>Expense Information</h2>
            <dl className="detail-fields">
              <div><dt>Paid For</dt><dd>{expense.paidFor}<small>{expense.paidForType}</small></dd></div>
              <div><dt>Department</dt><dd>{expense.department || "—"}</dd></div>
              <div><dt>Category</dt><dd>{expense.category}</dd></div>
              <div><dt>Project</dt><dd>{expense.vendor || "—"}</dd></div>
              <div className="detail-notes-field"><dt>Notes</dt><dd>{expense.purpose}</dd></div>
            </dl>
          </section>
        </div>
        <aside className="panel detail-quick-actions">
          <h2>ACTIONS</h2>
          <div className="detail-action-buttons">
            <Link className="button button-primary" to={`/expenses/${expense.id}/edit`}>
              <Pencil size={18} /> Edit Expense
            </Link>
            <button className="button button-outline" onClick={() => showToast("Use Print to save a PDF copy of this expense.")}>
              <Download size={18} /> Download PDF
            </button>
            <button className="button button-outline" onClick={() => window.print()}>
              <Printer size={18} /> Print
            </button>
            <button className="button button-outline detail-review-button" onClick={markReviewed}>
              <ShieldCheck size={18} /> Mark as Reviewed
            </button>
          </div>
          <button className="detail-delete-button" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={18} /> Delete Expense
          </button>
        </aside>
        <section className="panel supporting-panel">
          <div className="supporting-heading">
            <h2>Supporting Documents</h2>
            <button className="text-button" onClick={() => showToast("File upload is available in Add Expense.")}>
              <Upload size={15} /> Add File
            </button>
          </div>
          <div className="supporting-documents-grid">
            <article className="supporting-document-card">
              <div className="supporting-document-preview">
                <FileText size={30} />
                {!expense.receipt && <span>No preview attached</span>}
              </div>
              <strong>{expense.receipt ? "Receipt.pdf" : "Receipt not attached"}</strong>
              <small>{expense.receipt ? "Uploaded with this expense" : "Add a receipt to complete this record."}</small>
            </article>
            <article className="supporting-document-card supporting-placeholder"><div className="supporting-document-preview"><Upload size={24} /><span>Upload supporting file</span></div></article>
            <article className="supporting-document-card supporting-placeholder"><div className="supporting-document-preview"><Upload size={24} /><span>Upload supporting file</span></div></article>
          </div>
        </section>
      </div>
      {confirmDelete && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <span className="delete-icon">
              <Trash2 size={20} />
            </span>
            <h2 id="delete-title">Delete this expense?</h2>
            <p>
              This will remove <strong>{expense.id}</strong> from the expense
              records.
            </p>
            <div className="heading-actions">
              <button
                className="button button-outline"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
              <button className="button button-danger" onClick={removeExpense}>
                Delete expense
              </button>
            </div>
          </section>
        </div>
      )}
      {toast}
    </>
  );
}
