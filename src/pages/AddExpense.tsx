import { useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Check, CloudUpload, FileText, Plus, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatDate, formatRupees } from "../data/expenses";
import { useExpenses } from "../store";
import { PageHeading } from "../components/Shared";
import type { PaidForType } from "../types";

export function AddExpense() {
  const { addExpense, expenses, updateExpense } = useExpenses();
  const navigate = useNavigate();
  const { id } = useParams();
  const existingExpense = expenses.find((item) => item.id === id);
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState(
    existingExpense?.receipt ? "Current receipt attached" : "",
  );
  const [error, setError] = useState("");
  const [amount, setAmount] = useState(
    existingExpense ? String(existingExpense.amount) : "",
  );
  const [vendor, setVendor] = useState(existingExpense?.vendor ?? "");
  const [category, setCategory] = useState(existingExpense?.category ?? "");
  const [expenseDate, setExpenseDate] = useState(
    existingExpense?.date ?? new Date().toISOString().slice(0, 10),
  );
  const [forType, setForType] = useState<PaidForType>(
    existingExpense?.paidForType ?? "Client",
  );
  const handleFile = (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("The file must be smaller than 5 MB.");
      return;
    }
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      setError("Choose a PDF, JPG or PNG file.");
      return;
    }
    setError("");
    setFileName(file.name);
  };

  const saveExpense = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = {
      date: String(form.get("date")),
      vendor: String(form.get("vendor")).trim(),
      category: String(form.get("category")),
      amount: Number(form.get("amount")),
      purpose: String(form.get("purpose")).trim(),
      paidFor: String(form.get("paidFor")).trim(),
      paidForType: forType,
      receipt: Boolean(fileName),
    };
    if (existingExpense) {
      updateExpense(existingExpense.id, values);
      navigate(`/expenses/${existingExpense.id}`);
    } else {
      const expense = addExpense(values);
      navigate(`/expenses/${expense.id}`);
    }
  };

  return (
    <>
      <PageHeading
        title={existingExpense ? "Edit Expense" : "Add Expense"}
        description="Record a company expense and keep your monthly spending accurate."
        action={
          <Link className="button button-outline" to="/expenses">
            <ArrowLeft size={15} />
            Back to records
          </Link>
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
          <div className="form-grid">
            <label className="field">
              <span>
                Vendor / Client <i>*</i>
              </span>
              <input
                required
                name="vendor"
                placeholder="e.g. ABC Technologies"
                value={vendor}
                onChange={(event) => setVendor(event.target.value)}
              />
            </label>
            <label className="field">
              <span>
                Category <i>*</i>
              </span>
              <select
                name="category"
                required
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="" disabled>
                  Select a category
                </option>
                {[
                  "Travel",
                  "Meals",
                  "Equipment",
                  "Software",
                  "Office",
                  "Utilities",
                  "Other",
                ].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>
                Amount <i>*</i>
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
            <label className="field">
              <span>Payment Method</span>
              <select name="payment" defaultValue="Bank Transfer">
                <option>Bank Transfer</option>
                <option>Company Card</option>
                <option>Cash</option>
                <option>UPI</option>
              </select>
            </label>
          </div>
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
            <span>
              {forType === "Other" ? "Enter name" : "Paid for"} <i>*</i>
            </span>
            <input
              required
              name="paidFor"
              placeholder={
                forType === "Client" ? "Client or project name" : "Name or team"
              }
              defaultValue={existingExpense?.paidFor}
            />
          </label>
          <label className="field">
            <span>
              Expense purpose <i>*</i>
            </span>
            <textarea
              required
              name="purpose"
              rows={4}
              placeholder="Briefly describe what this expense was for..."
              defaultValue={existingExpense?.purpose}
            />
          </label>
          <label className="field field-date">
            <span>
              Expense date <i>*</i>
            </span>
            <input
              required
              type="date"
              name="date"
              value={expenseDate}
              onChange={(event) => setExpenseDate(event.target.value)}
            />
          </label>
          <div className="form-actions">
            <Link className="button button-outline" to="/expenses">
              Cancel
            </Link>
            <button className="button button-primary" type="submit">
              <Plus size={16} />
              {existingExpense ? "Save Changes" : "Save Expense"}
            </button>
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
                handleFile(event.dataTransfer.files[0]);
              }}
            >
              <span className="upload-icon">
                <CloudUpload size={22} />
              </span>
              <strong>{fileName || "Upload bill or receipt"}</strong>
              <small>PDF, JPG or PNG (max 5 MB)</small>
              <span className="button button-outline button-small">
                Browse files
              </span>
            </button>
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
            {fileName && (
              <div className="file-chip">
                <FileText size={17} />
                <span>
                  {fileName}
                  <small>Ready to attach</small>
                </span>
                <button
                  type="button"
                  onClick={() => setFileName("")}
                  aria-label="Remove receipt"
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
            <div className="preview-id">
              {existingExpense ? existingExpense.id : "DRAFT"} ·{" "}
              {formatDate(expenseDate)}
            </div>
            <div className="preview-line">
              <span>Vendor / Client</span>
              <strong>{vendor || "Enter a vendor or client"}</strong>
            </div>
            <div className="preview-line">
              <span>Category</span>
              <strong>{category || "Select a category"}</strong>
            </div>
            <div className="preview-line">
              <span>Expense date</span>
              <strong>{formatDate(expenseDate)}</strong>
            </div>
            <div className="preview-total">
              <span>TOTAL AMOUNT</span>
              <strong>{formatRupees(Number(amount) || 0)}</strong>
            </div>
            <p className="preview-note">
              Your expense will appear in the records as soon as you save it.
            </p>
          </section>
        </aside>
      </form>
    </>
  );
}
