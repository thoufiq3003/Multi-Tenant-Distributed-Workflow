import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, GitBranch, RotateCcw, ShieldCheck, Workflow, CheckCircle2 } from "lucide-react";
import { emailError, isAuthenticated, loginUser, phoneError } from "../services/auth";
import "./auth.css";

export function AuthAside() {
  return <aside className="auth-aside">
    <Link to="/login" className="logo"><span className="logo-mark"><Workflow size={20}/></span>Aegisflow</Link>
    <div className="auth-aside-copy">
      <h2>Run every workflow with Saga rollback built in.</h2>
      <ul>
        <li><GitBranch size={18}/><span>Build pipelines on a visual canvas that catches loops and orphan nodes.</span></li>
        <li><RotateCcw size={18}/><span>Failed steps roll back automatically, in reverse order.</span></li>
        <li><ShieldCheck size={18}/><span>Every organization gets its own isolated workspace.</span></li>
      </ul>
    </div>
    <small>Multi-tenant distributed workflow and Saga orchestration</small>
  </aside>;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [method, setMethod] = useState("email");
  const [identifier, setIdentifier] = useState(location.state?.identifier || "");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isAuthenticated()) return <Navigate to="/dashboard" replace />;

  const check = (m, v) => (m === "phone" ? phoneError(v) : emailError(v));

  const switchMethod = m => {
    if (m === method) return;
    setMethod(m); setIdentifier(""); setErrors({}); setFormError("");
  };

  const submit = async e => {
    e.preventDefault();
    const next = {};
    const idErr = check(method, identifier);
    if (idErr) next.identifier = idErr;
    if (!password) next.password = "Enter your password.";
    setErrors(next); setFormError("");
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await loginUser({ method, identifier: identifier.trim(), password });
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      else setFormError(err.message);
    } finally { setBusy(false); }
  };

  return <div className="auth-page">
    <AuthAside/>
    <main className="auth-main">
      <div className="auth-card">
        <h1>Sign in</h1>
        <p className="auth-sub">Welcome back. Sign in with your email or phone number.</p>

        {location.state?.registered && <div className="auth-banner success" role="status"><CheckCircle2 size={16}/>Account created. Sign in to continue.</div>}
        {formError && <div className="auth-banner error" role="alert">{formError}</div>}

        <div className="auth-tabs" role="tablist" aria-label="Sign in method">
          <button type="button" role="tab" aria-selected={method === "email"} className={method === "email" ? "active" : ""} onClick={() => switchMethod("email")}>Email</button>
          <button type="button" role="tab" aria-selected={method === "phone"} className={method === "phone" ? "active" : ""} onClick={() => switchMethod("phone")}>Phone number</button>
        </div>

        <form onSubmit={submit} noValidate>
          <div className="auth-field">
            <label htmlFor="identifier">{method === "phone" ? "Phone number" : "Email address"}</label>
            <input id="identifier" name="identifier" autoComplete={method === "phone" ? "tel-national" : "email"}
              type={method === "phone" ? "tel" : "email"} inputMode={method === "phone" ? "numeric" : "email"}
              placeholder={method === "phone" ? "10-digit number" : "name@company.com"}
              value={identifier} onChange={e => setIdentifier(e.target.value)}
              onBlur={() => identifier && setErrors(p => ({ ...p, identifier: check(method, identifier) }))}
              aria-invalid={Boolean(errors.identifier)} aria-describedby={errors.identifier ? "identifier-err" : undefined}/>
            {errors.identifier && <span className="auth-error" id="identifier-err">{errors.identifier}</span>}
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <div className="auth-password">
              <input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)}
                aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-err" : undefined}/>
              <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
            </div>
            {errors.password && <span className="auth-error" id="password-err">{errors.password}</span>}
          </div>

          <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>

        <p className="auth-switch">Don't have an account? <Link to="/register">Create an account</Link></p>
      </div>
    </main>
  </div>;
}
