import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  phone: { type: String, required: true, trim: true, unique: true },
  organization: { type: String, required: true, trim: true, maxlength: 80 },
  role: { type: String, required: true },
  tenantId: { type: String, required: true, index: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date }
}, { minimize: false });

export default mongoose.models.User || mongoose.model('User', userSchema);
