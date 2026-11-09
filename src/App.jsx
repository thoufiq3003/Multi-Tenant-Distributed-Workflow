import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Workflows from "./pages/Workflows.jsx";
import WorkflowBuilder from "./pages/WorkflowBuilder.jsx";
import Executions from "./pages/Executions.jsx";
import ExecutionDetails from "./pages/ExecutionDetails.jsx";
import Integrations from "./pages/Integrations.jsx";
import Failures from "./pages/Failures.jsx";
import Organization from "./pages/Organization.jsx";
import Settings from "./pages/Settings.jsx";
import Admin from "./pages/Admin.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import { isAuthenticated, logout, verifySession } from "./services/auth";

// Redirects to /login when signed out, and signs out if the server no longer accepts the session
function RequireAuth({ children }) {
  const location = useLocation();
  const authed = isAuthenticated();
  useEffect(() => {
    if (!authed) return;
    verifySession().then(ok => { if (!ok) { logout(); window.location.assign("/login"); } });
  }, [authed]);
  if (!authed) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

export default function App() {
  return <Routes>
    <Route path="login" element={<Login/>}/>
    <Route path="register" element={<Register/>}/>
    <Route element={<RequireAuth><Layout/></RequireAuth>}>
    <Route index element={<Home/>}/>
    <Route path="dashboard" element={<Dashboard/>}/>
    <Route path="workflows" element={<Workflows/>}/>
    <Route path="workflows/new" element={<WorkflowBuilder/>}/>
    <Route path="executions" element={<Executions/>}/>
    <Route path="executions/:id" element={<ExecutionDetails/>}/>
    <Route path="integrations" element={<Integrations/>}/>
    <Route path="failures" element={<Failures/>}/>
    <Route path="organization" element={<Organization/>}/>
    <Route path="settings" element={<Settings/>}/>
    <Route path="admin" element={<Admin/>}/>
    <Route path="*" element={<Home/>}/>
  </Route></Routes>;
}
