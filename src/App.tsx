import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './App.css';

const initialNodes: Node[] = [
  {
    id: 'start-1',
    type: 'input',
    position: { x: 250, y: 50 },
    data: { label: 'Start' },
  },
  {
    id: 'task-1',
    position: { x: 250, y: 190 },
    data: { label: 'Validate Order' },
  },
  {
    id: 'end-1',
    type: 'output',
    position: { x: 250, y: 330 },
    data: { label: 'End' },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'start-to-task',
    source: 'start-1',
    target: 'task-1',
    animated: true,
  },
  {
    id: 'task-to-end',
    source: 'task-1',
    target: 'end-1',
    animated: true,
  },
];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) => addEdge(connection, currentEdges));
    },
    [setEdges],
  );

  const resetWorkflow = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  };

  const handleSave = () => {
    const workflow = { nodes, edges };
    const blob = new Blob([JSON.stringify(workflow, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'workflow.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">ZAALIMA PROJECT</p>
          <h1>Workflow Builder</h1>
          <p className="subtitle">Build and connect tasks visually</p>
        </div>
        <div className="toolbar-actions">
          <button className="secondary-button" onClick={resetWorkflow}>
            Reset
          </button>
          <button className="primary-button" onClick={handleSave}>
            Export JSON
          </button>
        </div>
      </header>

      <section className="canvas-wrap" aria-label="Workflow canvas">
        <div className="canvas-hint">
          <span className="status-dot" />
          MVP canvas · Drag nodes to reposition · Connect node handles
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          nodesConnectable
          elementsSelectable
        >
          <Background gap={20} size={1} />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </section>
    </main>
  );
}