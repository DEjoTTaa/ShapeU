const mongoose = require('mongoose');

const dailyLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  dayOfWeek: { type: String },
  completions: [{
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal' },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date }
  }],
  completionRate: { type: Number, default: 0 },
  totalXPEarned: { type: Number, default: 0 },
  aiQuote: { type: String },
  aiAnalysis: { type: String },
  aiQuoteCount: { type: Number, default: 0 }
});

dailyLogSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyLog', dailyLogSchema);
