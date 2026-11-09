import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  eventType: { type: String, required: true, index: true },
  payload: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now }
}, { minimize: false });

eventSchema.index({ tenantId: 1, eventType: 1 });
export default mongoose.models.Event || mongoose.model('Event', eventSchema);

