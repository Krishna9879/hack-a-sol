const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: [{ type: String }],
  correctIndex: { type: Number, required: true },
  explanation: { type: String },
  topicId: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'] }
});

const quizSchema = new mongoose.Schema({
  topicId: { type: String, required: true },
  count: { type: Number, default: 10 },
  difficulty: { type: String, enum: ['mixed', 'easy', 'medium', 'hard'], default: 'mixed' },
  questions: [questionSchema],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);