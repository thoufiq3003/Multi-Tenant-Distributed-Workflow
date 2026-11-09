import mongoose from 'mongoose';

const dlqSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  executionId: { type: String, required: true, index: true },
  workflowId: { type: String, required: true, index: true },
  workflowName: { type: String, default: 'Workflow' },
  failedStepId: { type: String, default: '' },
  failedStepName: { type: String, default: 'Failed Step' },
  error: { type: String, required: true },
  payload: { type: Object, default: {} },
  retryCount: { type: Number, default: 0 },
  status: { type: String, enum: ['dead', 'replayed', 'resolved'], default: 'dead', index: true },
  replayedAt: { type: Date },
  replayedExecutionId: { type: String },
  createdAt: { type: Date, default: Date.now, index: true }
}, { minimize: false });

dlqSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

export default mongoose.models.Dlq || mongoose.model('Dlq', dlqSchema);

