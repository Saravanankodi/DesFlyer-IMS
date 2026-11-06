import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogOut, Pencil, Trash2, UserPlus, X } from "lucide-react";
import { PageHeading } from "../components/Shared";
import { useAuth } from "../auth";
import { accountService, type Account } from "../services/expenseService";

export function AdminSettings() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const editingAdmin = accounts.find((account) => account.email === editingEmail)?.role === "admin";

  useEffect(() => {
    let active = true;
    accountService.getAll()
      .then((users) => { if (active) setAccounts(users); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load user accounts."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const resetForm = () => {
    setEditingEmail(null);
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
  };

  const startEditing = (account: Account) => {
    setEditingEmail(account.email);
    setName(account.name);
    setEmail(account.email);
    setPassword("");
    setShowPassword(false);
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      if (editingEmail) {
        const oldEmail = editingEmail;
        const account = editingAdmin
          ? await accountService.updateAdminPassword(password)
          : await accountService.updateEmployee(oldEmail, {
            name: name.trim(),
            email: email.trim(),
            ...(password ? { password } : {}),
          });
        setAccounts((current) => current.map((item) => item.email === oldEmail ? account : item).sort((a, b) => a.name.localeCompare(b.name)));
        resetForm();
        setNotice(editingAdmin ? "Administrator password updated." : `Employee account updated for ${account.email}.`);
      } else {
        const account = await accountService.createEmployee({ name: name.trim(), email: email.trim(), password });
        setAccounts((current) => [...current, account].sort((a, b) => a.name.localeCompare(b.name)));
        resetForm();
        setNotice(`Employee login created for ${account.email}. Share the password with them securely.`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the employee account.");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAccount = async () => {
    if (!deleteTarget) return;
    const account = deleteTarget;
    setError("");
    setNotice("");
    setDeletingEmail(account.email);
    try {
      await accountService.deleteEmployee(account.email);
      setAccounts((current) => current.filter((item) => item.email !== account.email));
      if (editingEmail === account.email) resetForm();
      setDeleteTarget(null);
      setNotice(`Employee login deleted for ${account.email}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete the employee account.");
    } finally {
      setDeletingEmail(null);
    }
  };

  return (
    <div className="admin-settings-page">
      <PageHeading
        title="Settings"
        description="Manage employee access to the expense tracker."
        action={<button className="button secondary admin-mobile-logout" type="button" onClick={() => { signOut(); navigate("/login", { replace: true }); }}><LogOut size={18} />Log out</button>}
      />
      <div className="admin-settings-grid">
      <section className="panel admin-user-create-panel">
        <div className="admin-settings-heading">
          <div>
            <h2>{editingAdmin ? "Change Admin Password" : editingEmail ? "Edit Employee Login" : "Create Employee Login"}</h2>
            <p>{editingAdmin ? "Set a new password for the administrator account." : "Employees sign in using the credentials created here."}</p>
          </div>
          {editingEmail ? <Pencil size={22} aria-hidden="true" /> : <UserPlus size={22} aria-hidden="true" />}
        </div>
        <form className={`admin-user-form ${editingAdmin ? "admin-password-only" : ""}`} onSubmit={saveAccount}>
          {!editingAdmin && <label className="field"><span>Employee name</span><input required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>}
          {!editingAdmin && <label className="field"><span>Work email</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>}
          <label className="field admin-password-field">
            <span>{editingAdmin ? "New password" : editingEmail ? "New password (optional)" : "Set password"}</span>
            <span className="admin-password-control">
              <input required={!editingEmail || editingAdmin} minLength={password ? 8 : undefined} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder={editingEmail && !editingAdmin ? "Leave blank to keep current" : "At least 8 characters"} />
              <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </span>
          </label>
          <div className="admin-user-form-actions">
            {editingEmail && <button className="button button-outline" type="button" onClick={resetForm}><X size={15} /> Cancel</button>}
            <button className="button button-primary" type="submit" disabled={submitting}>{editingEmail ? <Pencil size={15} /> : <UserPlus size={16} />}{submitting ? "Saving…" : editingAdmin ? "Change Password" : editingEmail ? "Save Changes" : "Create Employee Login"}</button>
          </div>
        </form>
        {error && <p className="admin-settings-message error" role="alert">{error}</p>}
        {notice && <p className="admin-settings-message success" role="status">{notice}</p>}
      </section>
      <section className="panel admin-user-list-panel">
        <div className="admin-settings-heading"><div><h2>Accounts</h2><p>Manage employee logins. Administrator accounts are protected.</p></div></div>
        {loading ? <p className="admin-users-empty">Loading accounts…</p> : accounts.length ? (
          <div className="admin-accounts-table-wrap">
            <table className="admin-accounts-table">
              <thead>
                <tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Actions</th></tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.email}>
                    <td><span className="admin-account-name"><span className="admin-user-avatar">{(account.name || account.email).slice(0, 1).toUpperCase()}</span><strong>{account.name || account.email.split("@")[0]}</strong></span></td>
                    <td className="admin-account-email">{account.email}</td>
                    <td><span className={`admin-role-pill ${account.role}`}>{account.role === "admin" ? "Admin" : "Employee"}</span></td>
                    <td>
                      {account.role === "admin" ? <span className="admin-user-actions">
                        <button className="admin-user-edit" type="button" aria-label="Change admin password" title="Change admin password" onClick={() => startEditing(account)}><Pencil size={15} /></button>
                      </span> : <span className="admin-user-actions">
                        <button className="admin-user-edit" type="button" aria-label={`Edit ${account.name}`} title="Edit employee" onClick={() => startEditing(account)}><Pencil size={15} /></button>
                        <button className="admin-user-delete" type="button" aria-label={`Delete ${account.name}`} title={deletingEmail === account.email ? "Deleting employee" : "Delete employee"} disabled={deletingEmail === account.email} onClick={() => { setError(""); setDeleteTarget(account); }}><Trash2 size={15} /></button>
                      </span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="admin-users-empty">No accounts found.</p>}
      </section>
      </div>
      {deleteTarget && (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="settings-delete-title">
            <span className="delete-icon"><Trash2 size={20} /></span>
            <h2 id="settings-delete-title">Delete employee account?</h2>
            <p>Delete the login for <strong>{deleteTarget.name || deleteTarget.email}</strong>? They will no longer be able to sign in.</p>
            {error && <p className="admin-settings-message error" role="alert">{error}</p>}
            <div className="heading-actions">
              <button className="button button-outline" type="button" disabled={deletingEmail !== null} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="button button-danger" type="button" disabled={deletingEmail !== null} onClick={() => void deleteAccount()}>
                <Trash2 size={15} /> {deletingEmail ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
