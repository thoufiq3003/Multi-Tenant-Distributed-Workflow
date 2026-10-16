import mongoose from 'mongoose';
const executionSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  workflowId: { type: String, required: true, index: true },
  workflowName: { type: String, default: '' },
  status: { type: String, enum: ['Queued', 'Running', 'Completed', 'Failed', 'Compensated'], default: 'Queued' },
  startedAt: { type: Date, default: Date.now },
  finishedAt: Date,
  durationMs: { type: Number, default: 0 },
  retryCount: { type: Number, default: 0 },
  steps: { type: Array, default: [] },
  logs: { type: Array, default: [] },
  error: String
}, { minimize: false });
executionSchema.index({ tenantId: 1, startedAt: -1 });
export default mongoose.models.Execution || mongoose.model('Execution', executionSchema);
