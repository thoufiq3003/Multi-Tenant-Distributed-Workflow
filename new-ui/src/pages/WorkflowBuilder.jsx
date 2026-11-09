import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addEdge, applyEdgeChanges, applyNodeChanges, Background, Controls, MiniMap, ReactFlow, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, Check, CircleHelp, Clock3, Database, GitBranch, Mail, Plus, Save, Send, Settings2, ShoppingCart, Webhook, Trash2, Play, AlertTriangle, RotateCcw, ExternalLink } from 'lucide-react';
import { Button } from '../components/UI';
import { api } from '../services/api';
import { subscribeToTenantEvents } from '../services/socket';

const initialNodes = [
  { id:'1', type:'flowNode', position:{x:100,y:40}, data:{label:'Order Created',sub:'Trigger · Webhook',icon:'webhook',tone:'green',config:{}} },
  { id:'2', type:'flowNode', position:{x:100,y:165}, data:{label:'Check Payment',sub:'Action · HTTP request',icon:'database',tone:'blue',config:{url:'https://httpbin.org/get'}} },
  { id:'3', type:'flowNode', position:{x:100,y:290}, data:{label:'Payment Successful?',sub:'Condition',icon:'branch',tone:'purple',config:{branchResult:'yes'}} },
  { id:'4', type:'flowNode', position:{x:-10,y:430}, data:{label:'Ship Order',sub:'Action · HTTP request',icon:'cart',tone:'blue',config:{compensatable:true,compensationLabel:'Cancel Shipment'}} },
  { id:'5', type:'flowNode', position:{x:220,y:430}, data:{label:'Cancel Order',sub:'Compensation',icon:'database',tone:'red',config:{}} },
  { id:'6', type:'flowNode', position:{x:-10,y:555}, data:{label:'Notify Customer',sub:'Action · Email',icon:'mail',tone:'blue',config:{}} }
];

const initialEdges = [
  {id:'e1',source:'1',target:'2',animated:true},{id:'e2',source:'2',target:'3',animated:true},
  {id:'e3',source:'3',target:'4',label:'yes',style:{stroke:'#20a36b'},labelStyle:{fill:'#20a36b'}},
  {id:'e4',source:'3',target:'5',label:'no',style:{stroke:'#e4545b'},labelStyle:{fill:'#e4545b'}},
  {id:'e5',source:'4',target:'6',animated:true}
];

function FlowNode({ data, selected }) {
  const icons = { webhook:Webhook, database:Database, branch:GitBranch, cart:ShoppingCart, mail:Mail, schedule:Clock3 };
  const Icon = icons[data.icon] || Database;
  const execClass = data.executionState ? `exec-${data.executionState}` : '';

  return (
    <div className={`flow-node ${selected ? 'flow-node-selected' : ''} ${execClass}`}>
      <Handle type="target" position={Position.Top}/>
      <span className={`flow-node-icon ${data.tone || 'blue'}`}>
        <Icon size={16}/>
      </span>
      <span className="flow-node-copy">
        <strong>{data.label || 'Untitled node'}</strong>
        <small style={{ color: data.executionState === 'running' ? '#2563eb' : data.executionState === 'failed' ? '#dc2626' : data.executionState === 'completed' ? '#16a34a' : data.executionState === 'compensated' ? '#d97706' : undefined }}>
          {data.executionMessage || data.sub || 'Workflow step'}
        </small>
      </span>
      <Settings2 size={14} className="flow-node-settings"/>
      <Handle type="source" position={Position.Bottom}/>
    </div>
  );
}

const nodeTypes = { flowNode: FlowNode };

export default function WorkflowBuilder() {
  const [searchParams] = useSearchParams();
  const workflowId = searchParams.get('id');
  const [savedId, setSavedId] = useState(workflowId || null);
  const [name, setName] = useState('Order Processing');
  const [description, setDescription] = useState('Process new orders from store to warehouse and notify customers');
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [selectedId, setSelectedId] = useState('2');
  const [status, setStatus] = useState('Draft');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [busy, setBusy] = useState(false);
  const [validation, setValidation] = useState(null);
  const [liveStreamMessage, setLiveStreamMessage] = useState('');
  const [latestExecutionId, setLatestExecutionId] = useState(null);
  const navigate = useNavigate();

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedId), [nodes, selectedId]);
  const dirty = () => { setMessage('Unsaved changes'); setMessageType('info'); setValidation(null); };

  // Live WebSocket execution progress subscriber
  useEffect(() => {
    const unsubscribe = subscribeToTenantEvents({
      onProgress: (event) => {
        if (event.type === 'step:started') {
          setNodes(curr => curr.map(n => n.id === String(event.nodeId) ? {
            ...n,
            data: { ...n.data, executionState: 'running', executionMessage: 'Running now...' }
          } : n));
          setLiveStreamMessage(`▶ Step "${event.step?.name || event.nodeId}" is executing...`);
        } else if (event.type === 'step:retry') {
          setNodes(curr => curr.map(n => n.id === String(event.nodeId) ? {
            ...n,
            data: { ...n.data, executionState: 'running', executionMessage: `Retrying (${event.attempt}/${event.retryCount})...` }
          } : n));
          setLiveStreamMessage(`⚠ Step "${event.step?.name || event.nodeId}" retry attempt ${event.attempt}/${event.retryCount}...`);
        } else if (event.type === 'step:completed') {
          setNodes(curr => curr.map(n => n.id === String(event.nodeId) ? {
            ...n,
            data: { ...n.data, executionState: 'completed', executionMessage: 'Completed ✓' }
          } : n));
          setLiveStreamMessage(`✓ Step "${event.step?.name || event.nodeId}" completed.`);
        } else if (event.type === 'step:failed') {
          setNodes(curr => curr.map(n => n.id === String(event.nodeId) ? {
            ...n,
            data: { ...n.data, executionState: 'failed', executionMessage: 'Failed ✖' }
          } : n));
          setLiveStreamMessage(`✖ Step "${event.step?.name || event.nodeId}" failed: ${event.error || ''}`);
        } else if (event.type === 'step:compensating') {
          setNodes(curr => curr.map(n => n.id === String(event.nodeId) ? {
            ...n,
            data: { ...n.data, executionState: 'compensating', executionMessage: 'Rolling back...' }
          } : n));
          setLiveStreamMessage(`⟲ Saga Rollback: Compensating "${event.compStep?.name || event.nodeId}"...`);
        } else if (event.type === 'step:compensated') {
          setNodes(curr => curr.map(n => n.id === String(event.nodeId) ? {
            ...n,
            data: { ...n.data, executionState: 'compensated', executionMessage: 'Compensated ⟲' }
          } : n));
          setLiveStreamMessage(`⟲ Compensated: "${event.compStep?.name || event.nodeId}".`);
        } else if (event.type === 'execution:finished') {
          setLiveStreamMessage(`Execution ${event.execution?.id} finished with status: ${event.execution?.status}`);
        }
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!workflowId) return;
    api(`/workflows/${encodeURIComponent(workflowId)}`).then(item => {
      if (cancelled) return;
      setSavedId(item.id);
      setName(item.name);
      setDescription(item.description || '');
      setNodes(item.nodes || []);
      setEdges(item.edges || []);
      setStatus(item.status || 'Draft');
      setMessage('Workflow loaded');
      if (item.nodes?.length) setSelectedId(item.nodes[0].id);
    }).catch(err => {
      if (!cancelled) {
        setMessage(`Could not load workflow: ${err.message}`);
        setMessageType('error');
      }
    });
    return () => { cancelled = true; };
  }, [workflowId]);

  const onNodesChange = useCallback(changes => {
    setNodes(current => applyNodeChanges(changes, current));
    if (changes.some(c => c.type !== 'select' && c.type !== 'dimensions')) dirty();
  }, []);

  const onEdgesChange = useCallback(changes => {
    setEdges(current => applyEdgeChanges(changes, current));
    dirty();
  }, []);

  const onConnect = useCallback(connection => {
    setEdges(current => addEdge({ ...connection, id:`edge-${crypto.randomUUID()}` }, current));
    dirty();
  }, []);

  const addNode = (tone, label, sub, icon) => {
    const id = `node-${crypto.randomUUID().slice(0,8)}`;
    const isHttp = sub.includes('HTTP');
    const node = {
      id,
      type:'flowNode',
      position:{ x: 100 + (nodes.length % 3) * 80, y: 70 + nodes.length * 35 },
      data: {
        label,
        sub,
        icon,
        tone,
        config: isHttp ? { url: '', method: 'GET' } : {}
      }
    };
    setNodes(current => [...current, node]);
    setSelectedId(id);
    dirty();
  };

  const updateSelected = (key, value) => {
    if (!selectedNode) return;
    setNodes(current => current.map(node => node.id === selectedId ? ({ ...node, data: { ...node.data, [key]: value } }) : node));
    dirty();
  };

  const updateConfig = (key, value) => {
    if (!selectedNode) return;
    setNodes(current => current.map(node => node.id === selectedId ? ({
      ...node,
      data: { ...node.data, config: { ...(node.data.config || {}), [key]: value } }
    }) : node));
    dirty();
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setNodes(current => current.filter(n => n.id !== selectedId));
    setEdges(current => current.filter(e => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
    dirty();
  };

  const payload = () => ({
    name,
    description,
    status,
    nodes,
    edges,
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-compensate' }
  });

  const validate = async () => {
    setBusy(true);
    try {
      const result = await api('/workflows/validate', { method: 'POST', body: JSON.stringify({ nodes, edges }) });
      setValidation(result);
      setMessageType(result.valid ? 'success' : 'error');
      setMessage(result.valid ? `Validation passed · ${result.nodeCount} nodes, ${result.edgeCount} connections` : result.errors.join(' '));
    } catch (err) {
      setMessage(`Validation failed: ${err.message}`);
      setMessageType('error');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const item = savedId
        ? await api(`/workflows/${encodeURIComponent(savedId)}`, { method: 'PUT', body: JSON.stringify(payload()) })
        : await api('/workflows', { method: 'POST', body: JSON.stringify(payload()) });
      setSavedId(item.id);
      setStatus(item.status);
      setMessage('Draft saved to backend');
      setMessageType('success');
      if (!workflowId) navigate(`/workflows/new?id=${encodeURIComponent(item.id)}`, { replace: true });
    } catch (err) {
      setMessage(`Save failed: ${err.message}`);
      setMessageType('error');
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    try {
      let id = savedId;
      if (!id) {
        const item = await api('/workflows', { method: 'POST', body: JSON.stringify(payload()) });
        id = item.id;
        setSavedId(id);
      }
      const item = await api(`/workflows/${encodeURIComponent(id)}/publish`, { method: 'POST', body: JSON.stringify({}) });
      setStatus(item.status);
      setMessage('Workflow validated and published');
      setMessageType('success');
      navigate(`/workflows/new?id=${encodeURIComponent(id)}`, { replace: true });
    } catch (err) {
      const detail = err.payload?.validation?.errors?.join(' ') || err.message;
      setMessage(`Publish failed: ${detail}`);
      setMessageType('error');
    } finally {
      setBusy(false);
    }
  };

  const run = async () => {
    setBusy(true);
    setLiveStreamMessage('Starting distributed execution...');
    // Reset node execution styling on canvas
    setNodes(curr => curr.map(n => ({
      ...n,
      data: { ...n.data, executionState: null, executionMessage: null }
    })));

    try {
      let id = savedId;
      if (!id) {
        const item = await api('/workflows', { method: 'POST', body: JSON.stringify(payload()) });
        id = item.id;
        setSavedId(id);
      }
      const result = await api(`/workflows/${encodeURIComponent(id)}/execute`, {
        method: 'POST',
        body: JSON.stringify({ retryCount: 2 })
      });
      setLatestExecutionId(result.id);
      setMessage(`Execution ${result.id}: ${result.status} (${result.durationMs}ms)`);
      setMessageType(result.status === 'Completed' ? 'success' : result.status === 'Compensated' ? 'info' : 'error');
    } catch (err) {
      const detail = err.payload?.validation?.errors?.join(' ') || err.message;
      setMessage(`Execution failed: ${detail}`);
      setMessageType('error');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setName('Order Processing');
    setDescription('Process new orders from store to warehouse and notify customers');
    setSavedId(null);
    setStatus('Draft');
    setValidation(null);
    setLiveStreamMessage('');
    setMessage('Starter workflow restored');
    setMessageType('info');
  };

  return (
    <div className="page-content builder-page">
      <div className="builder-top">
        <button className="back-link" onClick={() => navigate('/workflows')}>
          <ArrowLeft size={16}/> Workflows
        </button>
        <div className="builder-top-actions">
          <span className="draft-indicator"><i/> {status}</span>
          {latestExecutionId && (
            <Button variant="secondary" icon={ExternalLink} onClick={() => navigate(`/executions/${latestExecutionId}`)}>
              Inspect Run {latestExecutionId}
            </Button>
          )}
          <Button variant="secondary" icon={Save} disabled={busy} onClick={save}>Save draft</Button>
          <Button variant="secondary" icon={Play} disabled={busy} onClick={run}>Run test</Button>
          <Button icon={Send} disabled={busy} onClick={publish}>Publish workflow</Button>
        </div>
      </div>

      <div className="builder-heading">
        <div>
          <div className="eyebrow">VISUAL WORKFLOW EDITOR</div>
          <input className="builder-title-input" value={name} onChange={e => { setName(e.target.value); dirty(); }} maxLength={120}/>
          <p>Design your automation by connecting triggers, actions, and conditions.</p>
        </div>
        <div className={`builder-validation ${messageType}`}>
          <span>{messageType === 'error' ? <AlertTriangle size={15}/> : <Check size={15}/>}</span>
          {message || 'Changes are local until saved'}
        </div>
      </div>

      {liveStreamMessage && (
        <div className="live-stream-banner">
          <div className="live-stream-dot" />
          <span>Live Execution Stream: {liveStreamMessage}</span>
        </div>
      )}

      {validation?.errors?.length > 0 && (
        <div className="validation-errors">
          {validation.errors.map((error, i) => (
            <div key={i}><AlertTriangle size={14}/>{error}</div>
          ))}
        </div>
      )}

      <div className="builder-layout">
        <aside className="node-library">
          <div className="builder-section-heading">Node library <CircleHelp size={15}/></div>
          <p>Choose a step, then connect it on the canvas.</p>
          <div className="node-category">TRIGGERS</div>
          <button className="library-node" onClick={() => addNode('green','Webhook Trigger','Trigger · Webhook','webhook')}>
            <span className="library-icon green"><Webhook size={16}/></span>
            <span><strong>Webhook</strong><small>Incoming event</small></span>
            <Plus size={14}/>
          </button>
          <button className="library-node" onClick={() => addNode('purple','Schedule Trigger','Trigger · Schedule','schedule')}>
            <span className="library-icon purple"><Clock3 size={16}/></span>
            <span><strong>Schedule</strong><small>Run on a schedule</small></span>
            <Plus size={14}/>
          </button>
          <div className="node-category">ACTIONS</div>
          <button className="library-node" onClick={() => addNode('blue','HTTP Request','Action · HTTP request','database')}>
            <span className="library-icon blue"><Database size={16}/></span>
            <span><strong>HTTP Request</strong><small>Call real API / Webhook</small></span>
            <Plus size={14}/>
          </button>
          <button className="library-node" onClick={() => addNode('blue','Send Email','Action · Email','mail')}>
            <span className="library-icon blue"><Mail size={16}/></span>
            <span><strong>Send Email</strong><small>Notify customer</small></span>
            <Plus size={14}/>
          </button>
          <div className="node-category">LOGIC</div>
          <button className="library-node" onClick={() => addNode('purple','Condition','Condition · Branch','branch')}>
            <span className="library-icon purple"><GitBranch size={16}/></span>
            <span><strong>Condition</strong><small>Branch on rule</small></span>
            <Plus size={14}/>
          </button>
          <button className="library-node" onClick={() => addNode('red','Compensation Action','Compensation','database')}>
            <span className="library-icon red"><RotateCcw size={16}/></span>
            <span><strong>Compensation</strong><small>Saga undo rollback</small></span>
            <Plus size={14}/>
          </button>
          <button className="text-link reset-workflow" onClick={reset}>Reset starter workflow</button>
        </aside>

        <div className="builder-canvas">
          <div className="canvas-topbar">
            <span><span className="canvas-dot"/> Canvas</span>
            <span>{nodes.length} nodes · {edges.length} connections</span>
          </div>
          <div className="flow-canvas">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_event, node) => setSelectedId(node.id)}
              onPaneClick={() => setSelectedId(null)}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.25}
              maxZoom={1.6}
              nodesDraggable
              nodesConnectable
              elementsSelectable
              deleteKeyCode={['Backspace','Delete']}
            >
              <Background color="#dce3ed" gap={20}/>
              <MiniMap pannable zoomable/>
              <Controls/>
            </ReactFlow>
          </div>
        </div>

        <aside className="node-config">
          <div className="builder-section-heading">
            {selectedNode ? 'Node configuration' : 'Workflow settings'}
          </div>

          {selectedNode ? (
            <>
              <label className="field-label">
                Node label
                <input value={selectedNode.data.label || ''} onChange={e => updateSelected('label', e.target.value)} maxLength={120}/>
              </label>
              <label className="field-label">
                Node type
                <input value={selectedNode.data.sub || ''} onChange={e => updateSelected('sub', e.target.value)}/>
              </label>

              {/* Condition Node Configuration */}
              {(String(selectedNode.data.sub || '').toLowerCase().includes('condition') || String(selectedNode.data.label || '').includes('?')) && (
                <>
                  <label className="field-label">
                    Branch rule expression (optional)
                    <input
                      placeholder="e.g. ctx.amount > 100"
                      value={selectedNode.data.config?.rule || ''}
                      onChange={e => updateConfig('rule', e.target.value)}
                    />
                  </label>
                  <label className="field-label">
                    Default branch choice
                    <select
                      value={selectedNode.data.config?.branchResult || 'yes'}
                      onChange={e => updateConfig('branchResult', e.target.value)}
                    >
                      <option value="yes">Yes / True branch</option>
                      <option value="no">No / False branch</option>
                    </select>
                  </label>
                </>
              )}

              {/* HTTP Action Node Configuration */}
              {(String(selectedNode.data.sub || '').toLowerCase().includes('http') || String(selectedNode.data.sub || '').toLowerCase().includes('action')) && (
                <>
                  <label className="field-label">
                    HTTP Request Method
                    <select
                      value={selectedNode.data.config?.method || 'GET'}
                      onChange={e => updateConfig('method', e.target.value)}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </label>
                  <label className="field-label">
                    Target Endpoint URL (optional)
                    <input
                      placeholder="https://httpbin.org/get"
                      value={selectedNode.data.config?.url || ''}
                      onChange={e => updateConfig('url', e.target.value)}
                    />
                  </label>
                </>
              )}

              <label className="check-field">
                <input
                  type="checkbox"
                  checked={Boolean(selectedNode.data.config?.compensatable)}
                  onChange={e => updateConfig('compensatable', e.target.checked)}
                />
                Mark as compensatable action (Included in Saga Rollback)
              </label>

              {Boolean(selectedNode.data.config?.compensatable) && (
                <label className="field-label">
                  Compensation Label
                  <input
                    placeholder="e.g. Cancel Shipment"
                    value={selectedNode.data.config?.compensationLabel || ''}
                    onChange={e => updateConfig('compensationLabel', e.target.value)}
                  />
                </label>
              )}

              <label className="check-field">
                <input
                  type="checkbox"
                  checked={Boolean(selectedNode.data.config?.simulateFailure)}
                  onChange={e => updateConfig('simulateFailure', e.target.checked)}
                />
                Simulate failure (for retry & Saga testing)
              </label>

              <Button variant="secondary" icon={Trash2} onClick={removeSelected}>
                Delete selected node
              </Button>
            </>
          ) : (
            <>
              <label className="field-label">
                Workflow name
                <input value={name} onChange={e => { setName(e.target.value); dirty(); }} maxLength={120}/>
              </label>
              <label className="field-label">
                Description
                <textarea rows={3} value={description} onChange={e => { setDescription(e.target.value); dirty(); }} maxLength={1000}/>
              </label>
              <label className="field-label">
                Execution timeout
                <select defaultValue="5 minutes">
                  <option>1 minute</option>
                  <option>5 minutes</option>
                  <option>15 minutes</option>
                  <option>1 hour</option>
                </select>
              </label>
              <div className="config-info">
                <CircleHelp size={16}/>
                <span>Pick a node to configure real HTTP endpoints, failure simulation, or Saga rollback parameters.</span>
              </div>
            </>
          )}

          <Button variant="secondary" disabled={busy} onClick={validate}>
            Validate workflow
          </Button>
        </aside>
      </div>
    </div>
  );
}
