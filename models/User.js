const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  avatar: {
    type: { type: String, enum: ['predefined', 'unlockable', 'custom'], default: 'predefined' },
    value: { type: String, default: '😀' }
  },
  theme: {
    type: String,
    enum: ['gold', 'blue', 'green', 'pink'],
    default: 'gold'
  },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  totalGoalsCompleted: { type: Number, default: 0 },
  totalPerfectDays: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: Date.now },
  consecutiveLogins: { type: Number, default: 0 }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
