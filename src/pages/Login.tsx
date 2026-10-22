import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import brandLogo from "../assets/desflyer-logo.png";

export function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!String(data.get("email")).includes("@")) {
      setError("Enter a valid work email address.");
      return;
    }
    setError("");
    navigate("/");
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <header className="login-brand">
          <img src={brandLogo} alt="DesFlyer" />
          <span>INTERNAL EXPENSE MANAGEMENT SYSTEM</span>
        </header>
        <div className="login-form-wrap">
          <span className="workspace-pill">WORKSPACE ACCESS</span>
          <h2>Welcome Back</h2>
          <p>Log in to access your secure DesFlyer workspace.</p>
          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>Work Email</span>
              <div className="login-input">
                <Mail size={17} />
                <input
                  required
                  name="email"
                  type="email"
                  placeholder="name@desflyer.com"
                  autoComplete="email"
                />
              </div>
            </label>
            <label className="field">
              <span>Password</span>
              <div className="login-input">
                <LockKeyhole size={17} />
                <input
                  required
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>
            </label>
            <div className="login-options">
              <label>
                <input type="checkbox" /> Remember me
              </label>
              <button
                type="button"
                onClick={() =>
                  setError(
                    "Contact your administrator to reset your password.",
                  )
                }
              >
                Forgot password?
              </button>
            </div>
            {error && <p className="field-error">{error}</p>}
            <button
              className="button button-primary login-submit"
              type="submit"
            >
              Log in <ArrowRight size={16} />
            </button>
          </form>
          <div className="login-disclaimer">
            <ShieldCheck size={13} /> Secure access for authorized DesFlyer employees only
          </div>
        </div>
        <div className="login-footer">
          <span>© 2026 DesFlyer</span><i>•</i><span>Internal Use Only</span><i>•</i><Link to="/">Privacy</Link><i>•</i><Link to="/">Support</Link><i>•</i><span>Version 1.0</span>
        </div>
      </div>
      <footer className="login-site-footer"><span>© 2026 Internal Expense. Discover. Build. Share. Innovate.</span><strong>POWERED BY DESFLYER</strong></footer>
    </div>
  );
}
