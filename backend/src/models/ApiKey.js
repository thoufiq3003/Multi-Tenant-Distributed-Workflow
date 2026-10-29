import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  label: { type: String, default: 'Development key', maxlength: 80 },
  hash: { type: String, required: true, index: true },
  lastFour: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }
}, { minimize: false });

apiKeySchema.index({ tenantId: 1, hash: 1 });
export default mongoose.models.ApiKey || mongoose.model('ApiKey', apiKeySchema);
