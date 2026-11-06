import { useRef, useState, type ChangeEvent } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  Download,
  FileText,
  Pencil,
  Printer,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatDate, formatRupees } from "../data/expenses";
import { fileToExpenseAttachment, getExpenseAttachments } from "../data/attachments";
import { useExpenses } from "../store";
import { useAuth } from "../auth";
import type { ExpenseAttachment } from "../types";
import { StatusBadge, useToast } from "../components/Shared";
import verifiedBadge from "../assets/transaction-verified-badge.jpg";
import pdfIcon from "../assets/transaction-pdf-icon.jpg";
import reviewedIcon from "../assets/transaction-reviewed-icon.jpg";

export function ExpenseDetail() {
  const { id = "" } = useParams();
  const { isAdmin } = useAuth();
  const { expenses, updateExpense, deleteExpense } = useExpenses();
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const exportContentRef = useRef<HTMLDivElement>(null);
  const expense = expenses.find((item) => item.id === id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<ExpenseAttachment | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [creatingPdf, setCreatingPdf] = useState(false);
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

  const markReviewed = async () => {
    await updateExpense(expense.id, { status: "Verified" });
    showToast("Expense marked as reviewed.");
  };
  const removeExpense = async () => {
    await deleteExpense(expense.id);
    navigate("/expenses", { state: { deleted: true } });
  };
  const attachments = getExpenseAttachments(expense);
  const creatorDisplayName = expense.createdByRole === "employee"
    ? expense.createdByName || expense.createdByEmail?.split("@", 1)[0] || "Employee"
    : "Admin";
  const attachReceipt = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    const combinedSize = [...attachments, ...files].reduce((total, item) => total + item.size, 0);
    if (combinedSize > 10 * 1024 * 1024) {
      showToast("All attached files together must be 10 MB or smaller.");
      return;
    }
    setUploadingReceipt(true);
    try {
      const newAttachments = await Promise.all(files.map(fileToExpenseAttachment));
      await updateExpense(expense.id, {
        receipt: true,
        receiptAttachments: [...attachments, ...newAttachments],
        receiptFileName: "",
        receiptDataUrl: "",
      });
      showToast(`${files.length} file${files.length === 1 ? "" : "s"} attached to this expense.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "The file could not be attached.");
    } finally {
      setUploadingReceipt(false);
    }
  };
  const removeAttachment = async (attachmentId: string) => {
    const remaining = attachments.filter((attachment) => attachment.id !== attachmentId);
    try {
      await updateExpense(expense.id, {
        receipt: remaining.length > 0,
        receiptAttachments: remaining,
        receiptFileName: "",
        receiptDataUrl: "",
      });
      showToast("File removed from this expense.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "The file could not be removed.");
    }
  };

  const downloadExpensePdf = async () => {
    if (!exportContentRef.current || creatingPdf) return;
    setCreatingPdf(true);
    try {
      const source = exportContentRef.current;
      // Render exports at a desktop viewport even when the app is open on a phone.
      const exportWidth = Math.max(1601, Math.ceil(source.getBoundingClientRect().width));
      await document.fonts.ready;
      await Promise.all(Array.from(source.querySelectorAll("img"), (image) => image.decode().catch(() => undefined)));
      const canvas = await html2canvas(source, {
        scale: 2,
        backgroundColor: "#fff",
        useCORS: true,
        windowWidth: exportWidth,
        windowHeight: Math.max(900, window.innerHeight),
        onclone: (_clonedDocument, clonedElement) => {
          clonedElement.style.width = `${exportWidth}px`;
          clonedElement.style.maxWidth = "none";
          clonedElement.style.background = "#fff";
          clonedElement.querySelector(".detail-page-heading > .button")?.remove();
          clonedElement.querySelector(".detail-page-heading .detail-back")?.remove();
          clonedElement.querySelector(".detail-quick-actions")?.remove();
          clonedElement.querySelector(".supporting-heading .text-button")?.remove();
          clonedElement.querySelector(".supporting-heading input")?.remove();
          clonedElement.querySelectorAll(".supporting-document-remove, .supporting-document-download").forEach((element) => element.remove());
          const workspace = clonedElement.querySelector<HTMLElement>(".detail-workspace");
          if (workspace) workspace.style.gridTemplateColumns = "minmax(0, 1fr)";
        },
      });
      const imageData = canvas.toDataURL("image/png");
      const orientation = canvas.width > canvas.height ? "landscape" : "portrait";
      const pdf = new jsPDF({ orientation, unit: "mm", format: "a4", compress: true });
      const margin = 10;
      const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;
      const renderedHeight = canvas.height * (pageWidth / canvas.width);

      if (renderedHeight <= pageHeight) {
        pdf.addImage(imageData, "PNG", margin, margin + (pageHeight - renderedHeight) / 2, pageWidth, renderedHeight);
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

      pdf.save(`expense-${expense.id}.pdf`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not create the expense PDF.");
    } finally {
      setCreatingPdf(false);
    }
  };

  return (
    <>
      <div className="transaction-detail-export" ref={exportContentRef}>
      <div className="detail-page-heading">
        <Link className="detail-back" to="/expenses" aria-label="Back to expense records">←</Link>
        <div><h1>Transaction Details</h1><p>Complete expense information and supporting<br className="detail-subtitle-mobile-break" /> documents.</p></div>
        <Link className="button button-primary" to={`/expenses/${encodeURIComponent(expense.id)}/edit`}><Pencil size={15} /> Edit Expense</Link>
      </div>
      <div className="detail-workspace">
        <div className="detail-left-column">
          <section className="panel detail-summary-card">
            <div className="detail-summary-heading">
              <div className="detail-id">
                <div>
                  <span>TRANSACTION ID</span>
                  <strong>{expense.id}</strong>
                </div>
              </div>
              <div className="detail-status-block">
                {expense.status === "Verified" ? <img className="transaction-verified-badge" src={verifiedBadge} alt="Verified" /> : <StatusBadge status={expense.status} />}
                <small>{formatDate(expense.date)}</small>
              </div>
            </div>
            <div className="detail-summary-values">
              <div className="detail-summary-value-list">
                <div><span>AMOUNT</span><strong>{formatRupees(expense.amount)}</strong></div>
                <div><span>PAYMENT METHOD</span><strong><FileText size={18} /> {expense.paymentMethod ?? "Bank Transfer"}</strong></div>
                <div><span>CREATED BY</span><strong>{creatorDisplayName}</strong></div>
              </div>
            </div>
          </section>
          <section className="panel info-panel">
            <h2>Expense Information</h2>
            <dl className="detail-fields">
              <div><dt>Paid For</dt><dd>{expense.paidFor}<small>{expense.paidForType}</small></dd></div>
              <div><dt>Department</dt><dd>{expense.department || "—"}</dd></div>
              <div><dt>Category</dt><dd>{expense.category}</dd></div>
              <div><dt>Project</dt><dd>{expense.vendor || "—"}</dd></div>
              <div className="detail-notes-field"><dt>Notes</dt><dd>{expense.purpose || "—"}</dd></div>
            </dl>
          </section>
        </div>
        <aside className="panel detail-quick-actions">
          <h2>ACTIONS</h2>
          <div className="detail-action-buttons">
            <Link className="button button-primary" to={`/expenses/${encodeURIComponent(expense.id)}/edit`}>
              <Pencil size={18} /> Edit Expense
            </Link>
            <button className="button button-outline" onClick={() => void downloadExpensePdf()} disabled={creatingPdf}>
              <Download size={18} /> {creatingPdf ? "Creating PDF…" : "Download PDF"}
            </button>
            <button className="button button-outline" onClick={() => window.print()}>
              <Printer size={18} /> Print
            </button>
            {isAdmin && <button className="button button-outline detail-review-button" onClick={markReviewed}>
              <img src={reviewedIcon} alt="" /> Mark as Reviewed
            </button>}
          </div>
          {isAdmin && <button className="detail-delete-button" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={18} /> <span>Delete Expense</span><small>ADMIN</small>
          </button>}
        </aside>
        <section className="panel supporting-panel">
          <div className="supporting-heading">
            <h2>Supporting Documents</h2>
            <input ref={receiptInputRef} className="sr-only" type="file" multiple onChange={attachReceipt} />
            <button className="text-button" type="button" disabled={uploadingReceipt} onClick={() => receiptInputRef.current?.click()}>
              <Upload size={15} /> {uploadingReceipt ? "Uploading…" : "Add File"}
            </button>
          </div>
          <div className={`supporting-documents-grid supporting-documents-count-${Math.min(Math.max(attachments.length, 1), 3)}`}>
            {attachments.length ? attachments.map((attachment) => {
              const isImage = attachment.type.startsWith("image/");
              const isPdf = attachment.type === "application/pdf" || attachment.name.toLowerCase().endsWith(".pdf");
              return (
                <article className="supporting-document-card" key={attachment.id}>
                  <button className="supporting-document-remove" type="button" aria-label={`Remove ${attachment.name}`} title={`Remove ${attachment.name}`} onClick={() => void removeAttachment(attachment.id)}>
                    <X size={16} />
                  </button>
                  <div className="supporting-document-preview">
                    <button className="transaction-receipt-open" type="button" onClick={() => setPreviewAttachment(attachment)} aria-label={`Preview ${attachment.name}`}>
                      {isImage ? <img className="transaction-receipt-preview" src={attachment.dataUrl} alt={attachment.name} /> : isPdf ? <img className="transaction-pdf-icon" src={pdfIcon} alt="PDF" /> : <FileText size={30} />}
                    </button>
                  </div>
                  <strong title={attachment.name}>{attachment.name}</strong>
                  <small>{(attachment.size / (1024 * 1024)).toFixed(2)} MB</small>
                  <a className="supporting-document-download" href={attachment.dataUrl} download={attachment.name}><Download size={14} /> Download</a>
                </article>
              );
            }) : (
              <article className="supporting-document-card supporting-placeholder">
                <div className="supporting-document-preview"><FileText size={30} /><span>{expense.receipt ? "Receipt status recorded; no file saved" : "No files attached"}</span></div>
                <strong>Supporting files</strong>
                <small>Add any file format to this expense.</small>
              </article>
            )}
          </div>
        </section>
      </div>
      </div>
      {previewAttachment && (() => {
        const previewIsImage = previewAttachment.type.startsWith("image/");
        const previewIsPdf = previewAttachment.type === "application/pdf" || previewAttachment.name.toLowerCase().endsWith(".pdf");
        return (
          <div className="modal-backdrop document-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewAttachment(null); }}>
            <section className="document-preview-modal" role="dialog" aria-modal="true" aria-label={`Preview ${previewAttachment.name}`}>
              <header className="document-preview-heading">
                <strong title={previewAttachment.name}>{previewAttachment.name}</strong>
                <button className="icon-button" type="button" aria-label="Close preview" onClick={() => setPreviewAttachment(null)}><X size={18} /></button>
              </header>
              <div className="document-preview-content">
                {previewIsImage ? <img src={previewAttachment.dataUrl} alt={previewAttachment.name} /> : previewIsPdf ? <iframe src={previewAttachment.dataUrl} title={previewAttachment.name} /> : <div className="document-preview-unavailable"><FileText size={36} /><p>Preview isn’t available for this file type.</p><p>Download the file to open it.</p></div>}
              </div>
              <footer className="document-preview-actions">
                <a className="button button-primary" href={previewAttachment.dataUrl} download={previewAttachment.name}><Download size={16} /> Download</a>
                <button className="button button-outline" type="button" onClick={() => setPreviewAttachment(null)}>Close</button>
              </footer>
            </section>
          </div>
        );
      })()}
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
