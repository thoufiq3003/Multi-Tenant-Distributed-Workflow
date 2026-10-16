import mongoose from 'mongoose';

const workflowSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 1000 },
  status: { type: String, enum: ['Draft', 'Active', 'Paused'], default: 'Draft' },
  nodes: { type: Array, default: [] },
  edges: { type: Array, default: [] },
  settings: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { minimize: false });
workflowSchema.index({ tenantId: 1, name: 1 });
export default mongoose.models.Workflow || mongoose.model('Workflow', workflowSchema);
