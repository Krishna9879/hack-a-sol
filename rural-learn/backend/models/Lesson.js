const mongoose = require('mongoose');

const mcqSchema = new mongoose.Schema({
  q: { type: String, required: true },
  options: [{ type: String }],
  answer: { type: Number, required: true },
  explanation: { type: String }
});

const lessonSchema = new mongoose.Schema({
  roadmapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap', required: true },
  topicId: { type: String, required: true },
  title: { type: String },
  summary: { type: String },
  keyPoints: [{ type: String }],
  stepByStep: [{ type: String }],
  examples: [{ type: String }],
  mcqs: [mcqSchema],
  status: { type: String, enum: ['processing', 'ready', 'failed'], default: 'processing' },
  ai: {
    pdfUrl: { type: String }
  },
  source: {
    youtubeUrl: { type: String },
    text: { type: String }
  },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Lesson', lessonSchema);