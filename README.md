# Zaalima Workflow Builder — MVP starter

A React + TypeScript + Vite starter for the visual workflow-builder project.

## Requirements
- Node.js (LTS recommended)
- npm

## Run locally
Open this folder in VS Code, then run:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

## Current features
- React Flow canvas with background, zoom controls, and minimap
- Start, Validate Order, and End nodes
- Pre-connected workflow edges
- Drag nodes around the canvas
- Connect nodes using their handles
- Reset to the starter workflow
- Export current nodes and edges to `workflow.json`

## Current limitations
- Export JSON downloads the workflow locally; it does not call a backend.
- No sidebar, custom node editor, condition branches, validation, or execution engine yet.
- Continue implementing features in the agreed 4-phase roadmap.
