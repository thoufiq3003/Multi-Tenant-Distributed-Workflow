import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Filter, MoreVertical } from 'lucide-react';
import { PageHeader, SearchBox, StatusBadge, Button } from '../components/UI';
import { api, formatDate } from '../services/api';

export default function Executions() {
  const [query,setQuery]=useState(''); const [status,setStatus]=useState('All statuses'); const [items,setItems]=useState([]); const [error,setError]=useState(''); const [loading,setLoading]=useState(true); const navigate=useNavigate();
  const load=useCallback(async()=>{setLoading(true);try{setItems(await api('/executions'));setError('');}catch(e){setError(`Backend unavailable: ${e.message}`);}finally{setLoading(false);}},[]);
  useEffect(()=>{load();},[load]);
  const filtered=useMemo(()=>items.filter(x=>(x.id+' '+(x.workflowName||x.name||'')).toLowerCase().includes(query.toLowerCase())&&(status==='All statuses'||x.status===status)),[items,query,status]);
  const download=()=>{const blob=new Blob([JSON.stringify(items,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='flowpilot-executions.json';a.click();URL.revokeObjectURL(url);};
  return <div className="page-content"><PageHeader eyebrow="RUN HISTORY" title="Executions" description="Monitor and troubleshoot every workflow run." actions={<Button variant="secondary" icon={Download} onClick={download}>Export</Button>}/>
    {error&&<div className="validation-errors"><div>{error}. Start the backend and refresh.</div></div>}
    <div className="inline-stats"><div><span>Total executions</span><strong>{items.length}</strong></div><div><span>Successful</span><strong className="green-text">{items.filter(x=>x.status==='Completed').length}</strong></div><div><span>Running now</span><strong className="blue-text">{items.filter(x=>x.status==='Running').length}</strong></div><div><span>Failed / compensated</span><strong className="red-text">{items.filter(x=>['Failed','Compensated'].includes(x.status)).length}</strong></div></div>
    <div className="panel table-panel"><div className="table-toolbar"><SearchBox value={query} onChange={setQuery} placeholder="Search by execution ID or workflow..."/><label className="filter-select"><Filter size={15}/><select value={status} onChange={e=>setStatus(e.target.value)}><option>All statuses</option><option>Completed</option><option>Running</option><option>Failed</option><option>Compensated</option></select></label><Button variant="secondary" onClick={load}>Refresh</Button></div>
      <div className="table-scroll"><table><thead><tr><th>Execution ID</th><th>Workflow name</th><th>Status</th><th>Started at</th><th>Duration</th><th>Actions</th></tr></thead><tbody>{filtered.map(x=><tr key={x.id}><td><button className="id-link" onClick={()=>navigate(`/executions/${encodeURIComponent(x.id)}`)}>{x.id}</button></td><td className="table-strong">{x.workflowName||x.name}</td><td><StatusBadge status={x.status}/></td><td>{formatDate(x.startedAt||x.started)}</td><td>{x.durationMs != null ? `${x.durationMs} ms` : (x.duration||'—')}</td><td><button className="icon-button subtle-icon" onClick={()=>navigate(`/executions/${encodeURIComponent(x.id)}`)} aria-label="View execution"><MoreVertical size={17}/></button></td></tr>)}</tbody></table></div>
      {!loading&&filtered.length===0&&<div className="table-empty">No executions yet. Open a saved workflow and click Run test.</div>}{loading&&<div className="table-empty">Loading executions…</div>}
    </div>
  </div>;
}
