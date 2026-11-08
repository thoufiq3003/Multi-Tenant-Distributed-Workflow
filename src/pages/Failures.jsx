import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RotateCcw, Trash2, Clock3, Play, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button, PageHeader, SearchBox, StatusBadge } from '../components/UI';
import { api, formatDate } from '../services/api';

export default function Failures() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('Failed executions');
  const [items, setItems] = useState([]);
  const [dlqItems, setDlqItems] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const [execList, dlqList] = await Promise.all([
        api('/executions'),
        api('/dlq').catch(() => [])
      ]);
      setItems(execList);
      setDlqItems(dlqList);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const failures = useMemo(() =>
    items.filter(x =>
      ['Failed', 'Compensated', 'Compensation Failed'].includes(x.status) &&
      ((x.workflowName || x.name || '') + ' ' + x.id + ' ' + (x.error || '')).toLowerCase().includes(query.toLowerCase())
    ),
    [items, query]
  );

  const filteredDlq = useMemo(() =>
    dlqItems.filter(d =>
      ((d.workflowName || '') + ' ' + d.id + ' ' + (d.error || '') + ' ' + (d.failedStepName || '')).toLowerCase().includes(query.toLowerCase())
    ),
    [dlqItems, query]
  );

  const retry = async (id) => {
    setBusyId(id);
    try {
      const result = await api(`/executions/${encodeURIComponent(id)}/retry`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      navigate(`/executions/${encodeURIComponent(result.id)}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId('');
    }
  };

  const replayDlqItem = async (dlqId) => {
    setBusyId(dlqId);
    try {
      const res = await api(`/dlq/${encodeURIComponent(dlqId)}/replay`, { method: 'POST' });
      await load();
      if (res.execution?.id) {
        navigate(`/executions/${encodeURIComponent(res.execution.id)}`);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId('');
    }
  };

  const discardDlqItem = async (dlqId) => {
    if (!window.confirm('Discard this DLQ item? It will be removed from the dead-letter queue.')) return;
    try {
      await api(`/dlq/${encodeURIComponent(dlqId)}`, { method: 'DELETE' });
      setDlqItems(curr => curr.filter(d => d.id !== dlqId && d._id !== dlqId));
    } catch (e) {
      setError(e.message);
    }
  };

  const activeDlqCount = dlqItems.filter(d => d.status === 'dead').length;

  return (
    <div className="page-content">
      <PageHeader
        eyebrow="RELIABILITY CENTER"
        title="Failures & Retries"
        description="Investigate failed runs, manage persistent Dead-Letter Queues (DLQ), and inspect retry policies."
        actions={<Button variant="secondary" icon={RotateCcw} onClick={load}>Refresh data</Button>}
      />

      {error && <div className="validation-errors"><div>{error}</div></div>}

      <div className="failure-stats">
        <div className="failure-stat">
          <span className="failure-stat-icon red"><AlertTriangle size={18} /></span>
          <div>
            <span>Failed executions</span>
            <strong>{failures.length}</strong>
            <small>Active tenant history</small>
          </div>
        </div>

        <div className="failure-stat">
          <span className="failure-stat-icon blue"><Clock3 size={18} /></span>
          <div>
            <span>Retry policy</span>
            <strong>2 retries</strong>
            <small>Exponential backoff (100ms base)</small>
          </div>
        </div>

        <div className="failure-stat">
          <span className="failure-stat-icon amber"><ShieldAlert size={18} /></span>
          <div>
            <span>Dead-letter queue</span>
            <strong>{activeDlqCount} active</strong>
            <small>Durable MongoDB DLQ storage</small>
          </div>
        </div>
      </div>

      <div className="panel table-panel">
        <div className="tab-bar">
          {['Failed executions', 'Dead-letter queue', 'Retry policies'].map(x => (
            <button className={tab === x ? 'active' : ''} onClick={() => setTab(x)} key={x}>
              {x} {x === 'Dead-letter queue' && activeDlqCount > 0 ? `(${activeDlqCount})` : ''}
            </button>
          ))}
        </div>

        {tab === 'Failed executions' ? (
          <>
            <div className="table-toolbar">
              <SearchBox value={query} onChange={setQuery} placeholder="Search failed executions..." />
              <span className="result-count">{failures.length} items</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Execution ID</th>
                    <th>Workflow</th>
                    <th>Error</th>
                    <th>Attempts</th>
                    <th>Started at</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {failures.map(x => (
                    <tr key={x.id}>
                      <td>
                        <button className="id-link" onClick={() => navigate(`/executions/${encodeURIComponent(x.id)}`)}>
                          {x.id}
                        </button>
                      </td>
                      <td className="table-strong">{x.workflowName || x.name}</td>
                      <td><span className="error-text">{x.error || x.status}</span></td>
                      <td>{x.retryCount ?? 0}</td>
                      <td className="muted-cell">{formatDate(x.startedAt)}</td>
                      <td>
                        <button className="small-primary" disabled={busyId === x.id} onClick={() => retry(x.id)}>
                          {busyId === x.id ? 'Retrying…' : 'Retry now'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {failures.length === 0 && (
              <div className="table-empty">No failed executions for this tenant.</div>
            )}
          </>
        ) : tab === 'Dead-letter queue' ? (
          <>
            <div className="table-toolbar">
              <SearchBox value={query} onChange={setQuery} placeholder="Search dead-letter queue..." />
              <span className="result-count">{filteredDlq.length} queued items</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>DLQ ID</th>
                    <th>Workflow</th>
                    <th>Failed Step</th>
                    <th>Error Message</th>
                    <th>Status</th>
                    <th>Enqueued At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDlq.map(d => (
                    <tr key={d.id || d._id}>
                      <td><code style={{ fontSize: '12px' }}>{d.id || d._id}</code></td>
                      <td className="table-strong">{d.workflowName || 'Workflow'}</td>
                      <td><span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>{d.failedStepName || d.failedStepId || 'Step'}</span></td>
                      <td><span className="error-text" title={d.error}>{String(d.error || '').slice(0, 60)}{String(d.error || '').length > 60 ? '…' : ''}</span></td>
                      <td>
                        <span className={`status-pill ${d.status === 'dead' ? 'failed' : d.status === 'replayed' ? 'running' : 'completed'}`}>
                          {d.status === 'dead' ? 'Dead Letter' : d.status === 'replayed' ? 'Replayed' : 'Resolved'}
                        </span>
                      </td>
                      <td className="muted-cell">{formatDate(d.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="small-primary"
                            disabled={busyId === (d.id || d._id)}
                            onClick={() => replayDlqItem(d.id || d._id)}
                            title="Replay this payload from DLQ"
                          >
                            <Play size={12} style={{ display: 'inline', marginRight: '4px' }} />
                            Replay
                          </button>
                          <button
                            className="icon-button subtle-icon"
                            onClick={() => discardDlqItem(d.id || d._id)}
                            title="Discard from DLQ"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredDlq.length === 0 && (
              <div className="table-empty">
                <CheckCircle2 size={24} style={{ color: '#10b981', margin: '0 auto 8px', display: 'block' }} />
                Dead-Letter Queue is clean. When a workflow permanently fails retries and compensation, it is automatically routed here.
              </div>
            )}
          </>
        ) : (
          <div className="retry-policy-list">
            <div>
              <div>
                <strong>Exponential Backoff Policy</strong>
                <p>Retries transient HTTP / script execution failures up to 2 times with bounded exponential backoff (100ms base).</p>
              </div>
              <span className="policy-pill">Active (2 Retries)</span>
            </div>
            <div>
              <div>
                <strong>Saga Reverse Compensation Rollback</strong>
                <p>Automatically triggers rollback handlers in strict reverse LIFO order upon downstream execution failure.</p>
              </div>
              <span className="policy-pill">Active</span>
            </div>
            <div>
              <div>
                <strong>Dead-Letter Queue (DLQ) Routing</strong>
                <p>Captures exhausted failure payloads in persistent MongoDB storage for manual inspection and zero-data-loss replay.</p>
              </div>
              <span className="policy-pill" style={{ background: '#dcfce7', color: '#166534' }}>Operational</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
