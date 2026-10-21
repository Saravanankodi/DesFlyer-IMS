import { useState } from "react";
import {
  ArrowLeft,
  Check,
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
import { PageHeading, StatusBadge, useToast } from "../components/Shared";

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
      <PageHeading
        title="Transaction Details"
        description="Complete expense information and supporting documents."
        action={
          <div className="heading-actions">
            <Link className="button button-outline" to="/expenses">
              <ArrowLeft size={15} />
              Back
            </Link>
            <Link
              className="button button-primary"
              to={`/expenses/${expense.id}/edit`}
            >
              <Pencil size={15} />
              Edit Expense
            </Link>
          </div>
        }
      />
      <section className="detail-hero panel">
        <div className="detail-id">
          <div className="document-icon">
            <FileText size={22} />
          </div>
          <div>
            <span>TRANSACTION ID</span>
            <strong>{expense.id}</strong>
            <small>{formatDate(expense.date)}</small>
          </div>
        </div>
        <StatusBadge status={expense.status} />
        <div className="detail-amount">
          <span>AMOUNT</span>
          <strong>{formatRupees(expense.amount)}</strong>
          <span>Payment method · Bank Transfer</span>
        </div>
      </section>
      <div className="detail-grid">
        <section className="panel info-panel">
          <div className="panel-heading">
            <div>
              <h2>Expense Information</h2>
              <p>Recorded details for this expense.</p>
            </div>
          </div>
          <dl className="detail-fields">
            <div>
              <dt>Vendor / Client</dt>
              <dd>{expense.vendor}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{expense.category}</dd>
            </div>
            <div>
              <dt>Paid for</dt>
              <dd>{expense.paidFor}</dd>
            </div>
            <div>
              <dt>Expense for</dt>
              <dd>{expense.paidForType}</dd>
            </div>
            <div>
              <dt>Expense date</dt>
              <dd>{formatDate(expense.date)}</dd>
            </div>
            <div className="detail-full">
              <dt>Purpose</dt>
              <dd>{expense.purpose}</dd>
            </div>
            <div>
              <dt>Created by</dt>
              <dd>Admin User</dd>
            </div>
            <div>
              <dt>Receipt status</dt>
              <dd>
                {expense.receipt ? "Receipt attached" : "Receipt missing"}
              </dd>
            </div>
          </dl>
        </section>
        <aside className="panel supporting-panel">
          <div className="panel-heading">
            <div>
              <h2>Supporting Documents</h2>
              <p>Receipts linked to this expense.</p>
            </div>
            <button
              className="text-button"
              onClick={() =>
                showToast("File upload is available in Add Expense.")
              }
            >
              <Upload size={15} />
              Add File
            </button>
          </div>
          {expense.receipt ? (
            <div className="document-row">
              <span className="file-icon">
                <FileText size={18} />
              </span>
              <span>
                <strong>Receipt.pdf</strong>
                <small>Uploaded with this expense</small>
              </span>
              <button
                className="icon-button"
                aria-label="Download receipt"
                onClick={() =>
                  showToast("Demo receipt file is not available to download.")
                }
              >
                <Download size={16} />
              </button>
            </div>
          ) : (
            <div className="empty-document">
              <FileText size={22} />
              <strong>No receipt attached</strong>
              <span>Add a receipt to complete this record.</span>
            </div>
          )}
        </aside>
      </div>
      <section className="panel action-panel">
        <div>
          <h2>Actions</h2>
          <p>Update the review status or manage this expense.</p>
        </div>
        <div className="heading-actions">
          <button
            className="button button-outline"
            onClick={() => window.print()}
          >
            <Printer size={15} />
            Print
          </button>
          <button className="button button-outline" onClick={markReviewed}>
            <ShieldCheck size={15} />
            Mark as reviewed
          </button>
          <button
            className="button button-danger"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={15} />
            Delete expense
          </button>
        </div>
      </section>
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
              This will remove <strong>{expense.id}</strong> from the demo
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
