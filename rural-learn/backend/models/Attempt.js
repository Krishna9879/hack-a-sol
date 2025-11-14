const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  selectedIndex: { type: Number, required: true },
  timeTakenSec: { type: Number }
});

const detailedResultSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  correct: { type: Boolean, required: true },
  explanation: { type: String }
});

const remediationSchema = new mongoose.Schema({
  topicId: { type: String, required: true },
  reason: { type: String },
  plan: [{
    action: { type: String },
    durationMin: { type: Number }
  }]
});

const attemptSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
  mockTestId: { type: mongoose.Schema.Types.ObjectId, ref: 'MockTest' },
  answers: [answerSchema],
  score: { type: Number },
  detailed: [detailedResultSchema],
  remediation: [remediationSchema],
  percentile: { type: Number },
  predictedPerformance: { type: String },
  timeStats: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model('Attempt', attemptSchema);