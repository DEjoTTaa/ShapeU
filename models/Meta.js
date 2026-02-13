const mongoose = require('mongoose');

const metaSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  icon: { type: String, default: '🎯' },
  targetValue: { type: Number, required: true, min: 1 },
  currentValue: { type: Number, default: 0 },
  unit: { type: String, default: 'vezes' },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  linkedGoalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', default: null },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

metaSchema.index({ userId: 1 });
metaSchema.index({ userId: 1, linkedGoalId: 1 });

module.exports = mongoose.model('Meta', metaSchema);
