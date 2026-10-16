import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, CheckCircle2, Clock3, XCircle, Workflow, ArrowRight, CalendarDays, ChevronDown } from "lucide-react";
import { chartData } from "../data";
import { api, formatDate } from "../services/api";
import { PageHeader, StatCard, StatusBadge } from "../components/UI";

const ranges = {
  "Last 7 Days": chartData,
  "Last 30 Days": [
    {date:"Sep 8",failed:8,running:13,successful:24},{date:"Sep 13",failed:11,running:18,successful:31},
    {date:"Sep 18",failed:7,running:15,successful:27},{date:"Sep 23",failed:15,running:23,successful:38},
    {date:"Sep 28",failed:10,running:19,successful:34},{date:"Oct 3",failed:13,running:21,successful:42},{date:"Oct 7",failed:7,running:19,successful:38}
  ],
  "Today": [
    {date:"9 AM",failed:2,running:5,successful:12},{date:"10 AM",failed:3,running:7,successful:18},
    {date:"11 AM",failed:1,running:6,successful:15},{date:"12 PM",failed:4,running:9,successful:22},
    {date:"1 PM",failed:2,running:5,successful:19},{date:"2 PM",failed:3,running:10,successful:26},{date:"3 PM",failed:1,running:7,successful:21}
  ]
};

export default function Dashboard() {
  const [range,setRange] = useState("Last 7 Days");
  const [metrics,setMetrics] = useState({workflowCount:0,activeWorkflows:0,executionCount:0,completed:0,failed:0,running:0,recentExecutions:[]});
  const [workflowItems,setWorkflowItems] = useState([]);
  const [loadError,setLoadError] = useState("");
  const navigate = useNavigate();
  useEffect(()=>{Promise.all([api("/metrics"),api("/workflows")]).then(([m,w])=>{setMetrics(m);setWorkflowItems(w);setLoadError("");}).catch(e=>setLoadError(`Backend data unavailable: ${e.message}`));},[]);
  return <div className="page-content">
    <PageHeader eyebrow="WORKSPACE OVERVIEW" title="Dashboard" description="Here's what's happening with your workflow automation." actions={<label className="select-control"><CalendarDays size={15}/><select value={range} onChange={e=>setRange(e.target.value)}>{Object.keys(ranges).map(x=><option key={x}>{x}</option>)}</select><ChevronDown size={14}/></label>} />
    <div className="stats-grid">
      <StatCard title="Total Executions" value={metrics.executionCount.toLocaleString()} change="From saved execution history" icon={Activity} tone="blue"/>
      <StatCard title="Completed" value={metrics.completed.toLocaleString()} change="Completed runs" icon={CheckCircle2} tone="green"/>
      <StatCard title="Currently Running" value={metrics.running.toLocaleString()} change="Running executions" icon={Clock3} tone="purple"/>
      <StatCard title="Failed" value={metrics.failed.toLocaleString()} change="Failed or compensated" icon={XCircle} tone="red"/>
    </div>
    <div className="dashboard-grid">
      <section className="panel chart-panel">
        <div className="panel-heading"><div><h2>Workflow Executions</h2><p>Execution activity over time</p></div><span className="soft-label">{range}</span></div>
        <div className="chart-legend"><span><i className="legend-dot failed-dot"/>Failed</span><span><i className="legend-dot running-dot"/>Running</span><span><i className="legend-dot success-dot"/>Successful</span></div>
        <div className="main-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={ranges[range]} margin={{top:8,right:8,left:-18,bottom:0}}>
          <defs>
            <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e4545b" stopOpacity={0.13}/><stop offset="100%" stopColor="#e4545b" stopOpacity={0.01}/></linearGradient>
            <linearGradient id="runGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3679ed" stopOpacity={0.13}/><stop offset="100%" stopColor="#3679ed" stopOpacity={0.01}/></linearGradient>
            <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#31a879" stopOpacity={0.13}/><stop offset="100%" stopColor="#31a879" stopOpacity={0.01}/></linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e7ebf0" strokeDasharray="3 4"/>
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill:"#8791a1",fontSize:11}} dy={8}/>
          <YAxis domain={[0,100]} ticks={[0,25,50,75,100]} axisLine={false} tickLine={false} tick={{fill:"#8791a1",fontSize:11}}/>
          <Tooltip contentStyle={{border:"1px solid #e5eaf0",borderRadius:10,fontSize:12}}/>
          <Area type="monotone" dataKey="failed" name="Failed" stroke="#e4545b" strokeWidth={1.7} fill="url(#failGrad)" activeDot={{r:4}}/>
          <Area type="monotone" dataKey="running" name="Running" stroke="#3679ed" strokeWidth={1.7} fill="url(#runGrad)" activeDot={{r:4}}/>
          <Area type="monotone" dataKey="successful" name="Successful" stroke="#31a879" strokeWidth={1.7} fill="url(#successGrad)" activeDot={{r:4}}/>
        </AreaChart></ResponsiveContainer></div>
      </section>
      <section className="panel recent-panel">
        <div className="panel-heading"><div><h2>Recent Executions</h2><p>Latest workflow activity</p></div><button className="text-link" onClick={()=>navigate("/executions")}>View all <ArrowRight size={14}/></button></div>
        <div className="recent-list">{metrics.recentExecutions.slice(0,5).map(item=><button className="recent-item" key={item.id} onClick={()=>navigate(`/executions/${item.id}`)}>
          <span className={`recent-icon ${item.status.toLowerCase()}`}>{item.status==="Completed"?<CheckCircle2 size={18}/>:item.status==="Running"?<Clock3 size={18}/>:<XCircle size={18}/>}</span>
          <span className="recent-name"><strong>{item.workflowName || item.name}</strong><small>{item.id}</small></span>
          <span className="recent-result"><StatusBadge status={item.status}/><small>{item.durationMs != null ? `${item.durationMs} ms` : "—"} · {formatDate(item.startedAt)}</small></span>
        </button>)}</div>
      </section>
    </div>
    <section className="panel workflows-panel"><div className="panel-heading"><div><h2>Active Workflows</h2><p>Quick overview of your automation processes</p></div><button className="text-link" onClick={()=>navigate("/workflows")}>Manage workflows <ArrowRight size={14}/></button></div>
      <div className="mini-workflows">{workflowItems.filter(w=>w.status==="Active").slice(0,3).map(w=><div className="mini-workflow" key={w.id}><div className="mini-workflow-icon"><Workflow size={17}/></div><div className="mini-workflow-copy"><strong>{w.name}</strong><small>{w.nodes?.length || 0} workflow nodes</small></div><StatusBadge status={w.status}/><span className="mini-success">{w.nodes?.length || 0} nodes</span></div>)}</div>
    </section>
    <div className="data-disclaimer">{loadError || "Dashboard totals and lists are loaded from the current tenant backend. The trend chart above is illustrative sample data."}</div>
  </div>;
}
