import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

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
      <div className="login-decoration">
        <div className="login-brand">
          <span className="brand-mark">
            <Wallet size={20} />
          </span>
          <strong>DesFlyer</strong>
        </div>
        <div className="login-message">
          <span>INTERNAL EXPENSE MANAGEMENT SYSTEM</span>
          <h1>
            Clarity for every
            <br />
            company expense.
          </h1>
          <p>
            One secure workspace to record, review and understand your team's
            spending.
          </p>
          <div className="login-feature">
            <ShieldCheck size={18} /> Built for authorized DesFlyer employees
          </div>
        </div>
        <div className="login-decoration-footer">
          © 2026 DesFlyer · Internal use only
        </div>
      </div>
      <main className="login-main">
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
                    "Contact your administrator to reset your demo password.",
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
            Secure access for authorized DesFlyer employees only
          </div>
        </div>
        <div className="login-footer">
          <span>© 2026 DesFlyer</span>
          <Link to="/">Demo workspace</Link>
          <span>Version 1.0</span>
          <span>Privacy</span>
        </div>
      </main>
    </div>
  );
}
