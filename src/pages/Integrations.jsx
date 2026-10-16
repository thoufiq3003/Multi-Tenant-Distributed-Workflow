import React, { useState } from "react";
import { Cable, CheckCircle2, ExternalLink, Plus, Search, Settings2, PlugZap, AlertTriangle } from "lucide-react";
import { integrations } from "../data";
import { Button, PageHeader, SearchBox, StatusBadge } from "../components/UI";

export default function Integrations() {
  const [query,setQuery]=useState(""); const [connected,setConnected]=useState(integrations);
  const visible=connected.filter(x=>(x.name+" "+x.category).toLowerCase().includes(query.toLowerCase()));
  return <div className="page-content"><PageHeader eyebrow="CONNECTED SERVICES" title="Integrations" description="Connect the business tools your workflows depend on." actions={<Button icon={Plus} onClick={()=>alert("Connect this to your integration catalog.")}>Add integration</Button>}/>
    <div className="integration-summary"><div><span className="integration-summary-icon green"><CheckCircle2 size={18}/></span><div><strong>5 connected</strong><small>Services are ready to use</small></div></div><div><span className="integration-summary-icon amber"><AlertTriangle size={18}/></span><div><strong>1 needs attention</strong><small>Check connection credentials</small></div></div></div>
    <div className="integration-toolbar"><SearchBox value={query} onChange={setQuery} placeholder="Search integrations..."/><button className="filter-select"><Cable size={15}/> All categories</button></div>
    <div className="integration-grid">{visible.map((item,i)=><div className="panel integration-card" key={item.name}><div className="integration-card-top"><div className={`integration-logo logo-${i%5}`}>{item.icon}</div><button className="icon-button subtle-icon" aria-label={`Settings for ${item.name}`}><Settings2 size={17}/></button></div><h3>{item.name}</h3><p>{item.category}</p><StatusBadge status={item.status==="Needs attention"?"Failed":"Connected"}/><div className="integration-card-bottom"><span>Updated recently</span><button onClick={()=>alert(`Open ${item.name} integration settings.`)}>Manage <ExternalLink size={13}/></button></div></div>)}</div>
  </div>;
}
