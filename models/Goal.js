const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  icon: { type: String, default: '🎯' },
  time: { type: String, default: '' },
  frequency: {
    type: { type: String, enum: ['daily', 'weekly', 'monthly', 'custom'], default: 'daily' },
    daysPerWeek: { type: Number },
    specificDays: [{ type: String, enum: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] }]
  },
  effortLevel: { type: String, enum: ['light', 'effort'], default: 'light' },
  totalCompletions: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  consecutiveMonths: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

goalSchema.index({ userId: 1 });

module.exports = mongoose.model('Goal', goalSchema);
