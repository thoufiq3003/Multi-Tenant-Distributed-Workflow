import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
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

export default function App() {
  return <Routes><Route element={<Layout/>}>
    <Route index element={<Dashboard/>}/>
    <Route path="workflows" element={<Workflows/>}/>
    <Route path="workflows/new" element={<WorkflowBuilder/>}/>
    <Route path="executions" element={<Executions/>}/>
    <Route path="executions/:id" element={<ExecutionDetails/>}/>
    <Route path="integrations" element={<Integrations/>}/>
    <Route path="failures" element={<Failures/>}/>
    <Route path="organization" element={<Organization/>}/>
    <Route path="settings" element={<Settings/>}/>
    <Route path="admin" element={<Admin/>}/>
    <Route path="*" element={<Dashboard/>}/>
  </Route></Routes>;
}
