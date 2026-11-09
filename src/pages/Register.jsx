import React, { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { AuthAside } from "./Login.jsx";
import { ROLES, emailError, isAuthenticated, passwordError, phoneError, registerUser } from "../services/auth";
import "./auth.css";

const empty = { name: "", email: "", phone: "", organization: "", role: "", password: "", confirm: "", terms: false };

function validate(v) {
  const e = {};
  if (v.name.trim().length < 2) e.name = "Enter your full name.";
  const em = emailError(v.email); if (em) e.email = em;
  const ph = phoneError(v.phone); if (ph) e.phone = ph;
  if (v.organization.trim().length < 2) e.organization = "Enter your organization name.";
  if (!ROLES.includes(v.role)) e.role = "Choose your role.";
  const pw = passwordError(v.password); if (pw) e.password = pw;
  if (v.confirm !== v.password || !v.confirm) e.confirm = "Passwords do not match.";
  if (!v.terms) e.terms = "Accept the terms to create your account.";
  return e;
}

export default function Register() {
  const navigate = useNavigate();
  const [values, setValues] = useState(empty);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const errors = useMemo(() => validate(values), [values]);
  if (isAuthenticated()) return <Navigate to="/dashboard" replace />;

  const set = (k, val) => { setValues(p => ({ ...p, [k]: val })); setServerErrors(p => ({ ...p, [k]: undefined })); };
  const blur = k => setTouched(p => ({ ...p, [k]: true }));
  const err = k => ((submitted || touched[k]) && errors[k]) || serverErrors[k] || "";

  const submit = async e => {
    e.preventDefault();
    setSubmitted(true); setFormError("");
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      const { name, email, phone, organization, role, password } = values;
      await registerUser({ name: name.trim(), email: email.trim(), phone: phone.trim(), organization: organization.trim(), role, password });
      navigate("/login", { replace: true, state: { registered: true, identifier: email.trim() } });
    } catch (ex) {
      if (ex.fields && Object.keys(ex.fields).length) setServerErrors(ex.fields);
      setFormError(ex.message);
    } finally { setBusy(false); }
  };

  const field = (k, label, props = {}) => <div className={`auth-field ${props.full ? "full" : ""}`}>
    <label htmlFor={k}>{label}</label>
    <input id={k} name={k} value={values[k]} onChange={e => set(k, e.target.value)} onBlur={() => blur(k)}
      aria-invalid={Boolean(err(k))} aria-describedby={err(k) ? `${k}-err` : undefined} {...props.input}/>
    {err(k) && <span className="auth-error" id={`${k}-err`}>{err(k)}</span>}
  </div>;

  return <div className="auth-page">
    <AuthAside/>
    <main className="auth-main">
      <div className="auth-card wide">
        <h1>Create your account</h1>
        <p className="auth-sub">Set up your workspace. Each organization gets its own isolated tenant.</p>
        {formError && <div className="auth-banner error" role="alert">{formError}</div>}

        <form onSubmit={submit} noValidate>
          <div className="auth-grid">
            {field("name", "Full name", { full: true, input: { autoComplete: "name", placeholder: "Asha Rao" } })}
            {field("email", "Email address", { input: { type: "email", autoComplete: "email", placeholder: "name@company.com" } })}
            {field("phone", "Phone number", { input: { type: "tel", inputMode: "numeric", autoComplete: "tel-national", placeholder: "10-digit number" } })}
            {field("organization", "Organization", { input: { autoComplete: "organization", placeholder: "Acme Ltd." } })}
            <div className="auth-field">
              <label htmlFor="role">Role</label>
              <select id="role" name="role" value={values.role} onChange={e => set("role", e.target.value)} onBlur={() => blur("role")} aria-invalid={Boolean(err("role"))}>
                <option value="">Select your role</option>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
              {err("role") && <span className="auth-error">{err("role")}</span>}
            </div>
            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <div className="auth-password">
                <input id="password" name="password" type={show ? "text" : "password"} autoComplete="new-password" value={values.password}
                  onChange={e => set("password", e.target.value)} onBlur={() => blur("password")} aria-invalid={Boolean(err("password"))}/>
                <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
              </div>
              {err("password") ? <span className="auth-error">{err("password")}</span> : <span className="auth-hint">At least 8 characters, with a letter and a number.</span>}
            </div>
            {field("confirm", "Confirm password", { input: { type: show ? "text" : "password", autoComplete: "new-password" } })}
          </div>

          <label className="auth-check">
            <input type="checkbox" checked={values.terms} onChange={e => set("terms", e.target.checked)} onBlur={() => blur("terms")}/>
            <span>I agree to the terms of use for this workspace.</span>
          </label>
          {err("terms") && <span className="auth-error">{err("terms")}</span>}

          <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
        </form>

        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </main>
  </div>;
}
