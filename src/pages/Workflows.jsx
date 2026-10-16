import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Workflow, Play, Pause, Pencil, MoreVertical, Filter, Trash2 } from 'lucide-react';
import { Button, PageHeader, SearchBox, StatusBadge } from '../components/UI';
import { api, formatDate } from '../services/api';

export default function Workflows() {
  const [query,setQuery] = useState(''); const [filter,setFilter] = useState('All statuses');
  const [items,setItems] = useState([]); const [loading,setLoading] = useState(true); const [error,setError] = useState('');
  const navigate = useNavigate();
  const load = useCallback(async () => { setLoading(true); try { setItems(await api('/workflows')); setError(''); } catch(e) { setError(`Backend unavailable: ${e.message}. Start the backend to load saved workflows.`); } finally { setLoading(false); } },[]);
  useEffect(()=>{load();},[load]);
  const filtered = useMemo(()=>items.filter(w=>(w.name+' '+(w.description||'')).toLowerCase().includes(query.toLowerCase())&&(filter==='All statuses'||w.status===filter)),[items,query,filter]);
  const toggle = async item => { try { const next = item.status==='Active'?'Paused':'Active'; const updated=await api(`/workflows/${encodeURIComponent(item.id)}/status`,{method:'PATCH',body:JSON.stringify({status:next})}); setItems(old=>old.map(w=>w.id===item.id?updated:w)); } catch(e) { setError(e.message); } };
  const remove = async item => { if(!window.confirm(`Delete “${item.name}”?`)) return; try { await api(`/workflows/${encodeURIComponent(item.id)}`,{method:'DELETE'}); setItems(old=>old.filter(w=>w.id!==item.id)); } catch(e) { setError(e.message); } };
  return <div className="page-content"><PageHeader eyebrow="AUTOMATION" title="Workflows" description="Create, manage, and monitor your automation workflows." actions={<Button icon={Plus} onClick={()=>navigate('/workflows/new')}>Create workflow</Button>}/>
    {error&&<div className="validation-errors"><div>{error}</div></div>}
    <div className="panel table-panel"><div className="table-toolbar"><SearchBox value={query} onChange={setQuery} placeholder="Search workflows..."/><label className="filter-select"><Filter size={15}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All statuses</option><option>Active</option><option>Paused</option><option>Draft</option></select></label><span className="result-count">{filtered.length} workflows</span></div>
      <div className="table-scroll"><table><thead><tr><th>Workflow name</th><th>Status</th><th>Trigger</th><th>Total runs</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{filtered.map(w=><tr key={w.id}><td><div className="table-primary"><span className="table-item-icon"><Workflow size={17}/></span><span><strong>{w.name}</strong><small>{w.description||'No description'}</small></span></div></td><td><StatusBadge status={w.status}/></td><td>{w.nodes?.find(n=>/trigger|start/i.test(`${n.data?.label||''} ${n.data?.sub||''}`))?.data?.label||'Manual'}</td><td>{w.executionCount ?? '—'}</td><td className="muted-cell">{formatDate(w.updatedAt)}</td><td><div className="row-actions"><button title="Edit workflow" onClick={()=>navigate(`/workflows/new?id=${encodeURIComponent(w.id)}`)}><Pencil size={15}/></button><button title={w.status==='Active'?'Pause workflow':'Activate workflow'} onClick={()=>toggle(w)}>{w.status==='Active'?<Pause size={15}/>:<Play size={15}/>}</button><button title="Delete workflow" onClick={()=>remove(w)}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>
      {!loading&&filtered.length===0&&<div className="table-empty">No saved workflows yet. Create a workflow and save it to see it here.</div>}{loading&&<div className="table-empty">Loading workflows…</div>}
    </div>
  </div>;
}
