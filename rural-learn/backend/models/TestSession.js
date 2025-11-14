const mongoose = require('mongoose');

const infractionLogSchema = new mongoose.Schema({
  type: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const testSessionSchema = new mongoose.Schema({
  mockTestId: { type: mongoose.Schema.Types.ObjectId, ref: 'MockTest', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  state: { type: String, enum: ['created', 'running', 'completed', 'submitted'], default: 'created' },
  sessionToken: { type: String },
  startedAt: { type: Date },
  expiresAt: { type: Date },
  infractionCount: { type: Number, default: 0 },
  infractions: [infractionLogSchema],
  allowedActions: { type: mongoose.Schema.Types.Mixed },
  antiCheatPolicy: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model('TestSession', testSessionSchema);