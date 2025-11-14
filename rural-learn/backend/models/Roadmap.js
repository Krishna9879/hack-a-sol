const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  subtopics: [{ type: String }],
  objectives: [{ type: String }],
  estimatedMinutes: { type: Number }
});

const roadmapSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], required: true },
  goal: { type: String },
  topics: [topicSchema],
  estimatedHours: { type: Number },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  source: { type: String, enum: ['ai', 'manual'], default: 'ai' }
}, { timestamps: true });

module.exports = mongoose.model('Roadmap', roadmapSchema);