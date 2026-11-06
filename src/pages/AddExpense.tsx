import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, CloudUpload, FileText, Image as ImageIcon, ReceiptText, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatDate, formatRupees } from "../data/expenses";
import { getCurrentMonthValue } from "../data/dates";
import { fileToExpenseAttachment, getExpenseAttachments } from "../data/attachments";
import { useExpenses } from "../store";
import { PageHeading } from "../components/Shared";
import { MonthPicker } from "../components/MonthPicker";
import type { ExpenseAttachment, PaidForType } from "../types";
import { useAuth } from "../auth";

const MAX_RECEIPT_SIZE = 10 * 1024 * 1024;

type ExpenseDraft = {
  selectedMonth: string;
  amount: string;
  vendor: string;
  department: string;
  paidFor: string;
  category: string;
  expenseDate: string;
  forType: PaidForType;
  purpose: string;
  paymentMethod: string;
};

function readExpenseDraft(key: string): Partial<ExpenseDraft> | null {
  try {
    const value = sessionStorage.getItem(key);
    return value ? JSON.parse(value) as Partial<ExpenseDraft> : null;
  } catch {
    return null;
  }
}

function clearExpenseDraft(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Keep a successful save successful even when browser storage is unavailable.
  }
}

function SavedValueInput({
  name,
  value,
  onChange,
  suggestions,
  placeholder,
  required = false,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder: string;
  required?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const query = value.trim().toLocaleLowerCase();
  const matches = query
    ? suggestions.filter((item) => item.toLocaleLowerCase().startsWith(query) && item.toLocaleLowerCase() !== query)
    : [];

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  return (
    <div className="saved-value-input" ref={containerRef}>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open && matches.length > 0}
        onFocus={() => setOpen(false)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(Boolean(event.target.value.trim()));
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "ArrowDown" && matches.length) setOpen(true);
        }}
      />
      {open && matches.length > 0 && (
        <div className="saved-value-options" role="listbox" aria-label={`Saved ${name} values`}>
          {matches.map((item) => (
            <button
              key={item}
              type="button"
              role="option"
              aria-selected="false"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(item);
                setOpen(false);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReceiptPreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const extension = file.name.split(".").pop()?.toLowerCase();
  const isImage = file.type.startsWith("image/") || ["jpg", "jpeg", "png"].includes(extension ?? "");
  const isPdf = file.type === "application/pdf" || extension === "pdf";

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className={`receipt-preview-tile ${isImage ? "receipt-preview-image" : "receipt-preview-document"}`}>
      {isImage && previewUrl ? (
        <img src={previewUrl} alt={file.name} />
      ) : isPdf && previewUrl ? (
        <iframe className="receipt-preview-pdf" src={previewUrl} title={`Preview of ${file.name}`} />
      ) : (
        <div className="receipt-preview-file-icon">
          <FileText size={24} />
        </div>
      )}
      <span title={file.name}>{file.name}</span>
      <button type="button" aria-label={`Remove ${file.name}`} onClick={onRemove}><X size={14} /></button>
    </div>
  );
}

function SavedReceiptPreview({ attachment, onRemove }: { attachment: ExpenseAttachment; onRemove: () => void }) {
  const isImage = attachment.type.startsWith("image/");
  const isPdf = attachment.type === "application/pdf" || attachment.name.toLowerCase().endsWith(".pdf");
  return (
    <div className={`receipt-preview-tile ${isImage ? "receipt-preview-image" : "receipt-preview-document"}`}>
      <a className="receipt-preview-saved-link" href={attachment.dataUrl} target="_blank" rel="noreferrer" download={attachment.name} aria-label={`Open ${attachment.name}`}>
        {isImage ? <img src={attachment.dataUrl} alt={attachment.name} /> : isPdf ? <FileText size={24} /> : <FileText size={24} />}
      </a>
      <span title={attachment.name}>{attachment.name}</span>
      <button type="button" aria-label={`Remove ${attachment.name}`} onClick={onRemove}><X size={14} /></button>
    </div>
  );
}

export function AddExpense() {
  const { addExpense, expenses, updateExpense } = useExpenses();
  const { email } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const existingExpense = expenses.find((item) => item.id === id);
  const draftKey = `desflyer-expense-draft:${email?.trim().toLowerCase() || "current-user"}`;
  const [initialDraft] = useState<Partial<ExpenseDraft> | null>(() => id ? null : readExpenseDraft(draftKey));
  const inputRef = useRef<HTMLInputElement>(null);
  const [savedAttachments, setSavedAttachments] = useState<ExpenseAttachment[]>(() => existingExpense ? getExpenseAttachments(existingExpense) : []);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(existingExpense ? getCurrentMonthValue() : initialDraft?.selectedMonth ?? getCurrentMonthValue());
  const [amount, setAmount] = useState(
    existingExpense ? String(existingExpense.amount) : initialDraft?.amount ?? "",
  );
  const [vendor, setVendor] = useState(existingExpense?.vendor ?? initialDraft?.vendor ?? "");
  const [department, setDepartment] = useState(existingExpense?.department ?? initialDraft?.department ?? "");
  const [paidFor, setPaidFor] = useState(existingExpense?.paidFor ?? initialDraft?.paidFor ?? "");
  const [category, setCategory] = useState(existingExpense?.category ?? initialDraft?.category ?? "");
  const [expenseDate, setExpenseDate] = useState(
    existingExpense?.date ?? initialDraft?.expenseDate ?? new Date().toISOString().slice(0, 10),
  );
  const [forType, setForType] = useState<PaidForType>(
    existingExpense?.paidForType ?? initialDraft?.forType ?? "Client",
  );
  const [purpose, setPurpose] = useState(existingExpense?.purpose ?? initialDraft?.purpose ?? "");
  const [paymentMethod, setPaymentMethod] = useState(existingExpense?.paymentMethod ?? initialDraft?.paymentMethod ?? "Bank Transfer");

  useEffect(() => {
    if (id) return;
    const draft: ExpenseDraft = {
      selectedMonth,
      amount,
      vendor,
      department,
      paidFor,
      category,
      expenseDate,
      forType,
      purpose,
      paymentMethod,
    };
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // Form entry remains usable if browser storage is unavailable.
    }
  }, [amount, category, department, draftKey, expenseDate, forType, id, paidFor, paymentMethod, purpose, selectedMonth, vendor]);

  const savedDepartments = Array.from(new Set(
    expenses.map((expense) => expense.department?.trim()).filter((value): value is string => Boolean(value)),
  ));
  const savedCategories = Array.from(new Set(
    expenses.map((expense) => expense.category.trim()).filter(Boolean),
  ));
  const savedPaidForValues = Array.from(new Set(
    expenses.map((expense) => expense.paidFor.trim()).filter(Boolean),
  ));
  const handleFiles = (files: FileList | File[]) => {
    const newFiles = Array.from(files);
    if (!newFiles.length) return;
    if (inputRef.current) inputRef.current.value = "";
    const combinedFiles = [...uploadedFiles, ...newFiles];
    if ([...savedAttachments, ...combinedFiles].reduce((total, file) => total + file.size, 0) > MAX_RECEIPT_SIZE) {
      setError("All attached files together must be 10 MB or smaller.");
      return;
    }
    setError("");
    setUploadedFiles(combinedFiles);
  };

  const saveExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    let receiptAttachments = savedAttachments;
    try {
      if (uploadedFiles.length) {
        receiptAttachments = [...receiptAttachments, ...await Promise.all(uploadedFiles.map(fileToExpenseAttachment))];
      }
    } catch {
      setError("One or more files could not be read. Please try again.");
      return;
    }
    const values = {
      date: String(form.get("date")),
      vendor: String(form.get("vendor")).trim(),
      category: String(form.get("category")),
      amount: Number(form.get("amount")),
      purpose: String(form.get("purpose")).trim(),
      paidFor: String(form.get("paidFor")).trim(),
      paidForType: forType,
      department: String(form.get("department")).trim(),
      paymentMethod: String(form.get("paymentMethod")),
      receipt: Boolean(receiptAttachments.length || uploadedFiles.length || (existingExpense?.receipt && !existingExpense.receiptDataUrl && !existingExpense.receiptAttachments?.length)),
      receiptAttachments,
      receiptFileName: "",
      receiptDataUrl: "",
    };
    if (existingExpense) {
      await updateExpense(existingExpense.id, values);
      navigate(`/expenses/${encodeURIComponent(existingExpense.id)}`);
    } else {
      const expense = await addExpense(values);
      clearExpenseDraft(draftKey);
      navigate(`/expenses/${encodeURIComponent(expense.id)}`);
    }
  };

  return (
    <>
      <PageHeading
        title={existingExpense ? "Edit Expense" : "Add Expense"}
        description="Record a company expense and keep your monthly spending accurate."
        action={
          <MonthPicker
            className="expense-month-picker"
            value={selectedMonth}
            onChange={setSelectedMonth}
            label="Select expense month and year"
          />
        }
      />
      <form className="expense-form" onSubmit={saveExpense}>
        <section className="form-column panel">
          <div className="form-section-heading">
            <div>
              <h2>{existingExpense ? "Edit Expense" : "Expense Details"}</h2>
              <p>Enter the information from the receipt.</p>
            </div>
            <span className="required-pill">REQUIRED INFORMATION</span>
          </div>
          <div className="field-stack">
            <label className="field field-amount">
              <span>
                Amount
              </span>
              <div className="input-with-prefix">
                <b>₹</b>
                <input
                  required
                  min="1"
                  step="0.01"
                  type="number"
                  name="amount"
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
            </label>
            <fieldset className="paid-for-group">
              <legend>Who is this expense for?</legend>
              <div className="choice-row">
                {["Client", "Employee", "Company / Office", "Other"].map(
                  (option) => (
                    <button
                      key={option}
                      type="button"
                      className={`choice ${forType === option ? "choice-active" : ""}`}
                      onClick={() => setForType(option as PaidForType)}
                    >
                      {forType === option && <Check size={14} />}
                      {option}
                    </button>
                  ),
                )}
              </div>
            </fieldset>
            <label className="field">
              <span>Enter Name / Description <i>*</i></span>
              <input required name="vendor" placeholder="e.g. Project 'Z' lunch" value={vendor} onChange={(event) => setVendor(event.target.value)} />
            </label>
            <div className="form-paired-fields">
              <label className="field">
                <span>What was this expense for? <i>*</i></span>
                <SavedValueInput
                  name="category"
                  required
                  placeholder="Type a category"
                  value={category}
                  onChange={setCategory}
                  suggestions={savedCategories}
                />
              </label>
              <label className="field">
                <span>Expense Date <i>*</i></span>
                <input required type="date" name="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} />
              </label>
            </div>
            <label className="field">
              <span>
                Purpose <i>*</i>
              </span>
              <textarea
                required
                name="purpose"
                rows={4}
                placeholder="Briefly describe what this expense was for..."
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
              />
            </label>
            <div className="form-paired-fields paid-for-fields">
              <label className="field">
                <span>
                  {forType === "Other" ? "Enter name" : "Paid for"} <i>*</i>
                </span>
                <SavedValueInput
                  name="paidFor"
                  required
                  placeholder={forType === "Client" ? "Client or project name" : "Name or team"}
                  value={paidFor}
                  onChange={setPaidFor}
                  suggestions={savedPaidForValues}
                />
              </label>
              <label className="field">
                <span>Department</span>
                <SavedValueInput
                  name="department"
                  placeholder="e.g. Development"
                  value={department}
                  onChange={setDepartment}
                  suggestions={savedDepartments}
                />
              </label>
            </div>
            <label className="field">
              <span>Payment Method</span>
              <select className="payment-method-select" name="paymentMethod" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                <option>Bank Transfer</option>
                <option>Company Card</option>
                <option>Cash</option>
                <option>UPI</option>
              </select>
            </label>
          </div>
        </section>
        <aside className="form-side">
          <section className="panel upload-panel">
            <div className="form-section-heading">
              <div>
                <h2>Receipt / Bill</h2>
                <p>Attach the proof of purchase.</p>
              </div>
            </div>
            <button
              type="button"
              className="upload-dropzone"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                handleFiles(event.dataTransfer.files);
              }}
            >
              <span className="upload-icon">
                <CloudUpload size={22} />
              </span>
              <strong>{uploadedFiles.length ? `Add more receipts (${uploadedFiles.length} selected)` : "Upload bills or receipts"}</strong>
              <small>Any file format (all attached files together up to 10 MB)</small>
            </button>
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              multiple
              onChange={(event) => event.target.files && handleFiles(event.target.files)}
            />
            {uploadedFiles.length > 0 && (
              <div className="file-chip">
                <span>
                  {uploadedFiles.length} {uploadedFiles.length === 1 ? "file" : "files"} ready to attach
                </span>
                <button
                  type="button"
                  onClick={() => setUploadedFiles([])}
                  aria-label="Remove all receipts"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {error && <p className="field-error">{error}</p>}
          </section>
          <section className="panel preview-panel">
            <div className="form-section-heading">
              <div>
                <h2>Expense Summary</h2>
                <p>Preview of the details you entered.</p>
              </div>
            </div>
            <div className="expense-preview-card">
              <div className="expense-preview-heading">
                <span className="expense-preview-icon"><ReceiptText size={18} /></span>
                <strong>RECEIPT PREVIEW</strong>
                <small>{existingExpense ? existingExpense.id : "#DF-DRAFT"}</small>
              </div>
              <div className="preview-line">
                <span>Vendor/Client</span>
                <strong>{vendor || "Enter a vendor or client"}</strong>
              </div>
              <div className="preview-line">
                <span>Category</span>
                <strong>{category || "Select a category"}</strong>
              </div>
              <div className="preview-line">
                <span>Date</span>
                <strong>{formatDate(expenseDate)}</strong>
              </div>
              <div className="preview-total">
                <span>TOTAL AMOUNT</span>
                <strong>{formatRupees(Number(amount) || 0)}</strong>
              </div>
              {savedAttachments.length + uploadedFiles.length > 0 ? (
                <div className={`preview-placeholder receipt-preview-grid receipt-preview-count-${Math.min(savedAttachments.length + uploadedFiles.length, 3)}`}>
                  {savedAttachments.map((attachment) => (
                    <SavedReceiptPreview
                      key={attachment.id}
                      attachment={attachment}
                      onRemove={() => setSavedAttachments((current) => current.filter((item) => item.id !== attachment.id))}
                    />
                  ))}
                  {uploadedFiles.map((file, index) => (
                    <ReceiptPreview
                      key={`${file.name}-${file.lastModified}-${index}`}
                      file={file}
                      onRemove={() => setUploadedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                    />
                  ))}
                </div>
              ) : (
                <div className="preview-placeholder">
                  <ImageIcon size={24} aria-hidden="true" />
                  <span>{existingExpense?.receipt ? "RECEIPT ALREADY ATTACHED" : "NO PREVIEW ATTACHED"}</span>
                </div>
              )}
            </div>
            <p className="preview-note">
              This is a digital generated preview based on your current inputs.
            </p>
          </section>
        </aside>
        <div className="form-actions">
          <Link className="button button-outline" to="/expenses">
            Cancel
          </Link>
          <button className="button button-primary" type="submit">
            {existingExpense ? "Save Changes" : "Save Expense"}
          </button>
        </div>
      </form>
    </>
  );
}
