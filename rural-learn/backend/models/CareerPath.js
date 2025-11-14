const mongoose = require('mongoose');

const phaseSchema = new mongoose.Schema({
  phase: { type: String, required: true },
  weeks: { type: Number, required: true },
  skills: [{ type: String }],
  projects: [{ type: String }]
});

const careerPathSchema = new mongoose.Schema({
  goal: { type: String, required: true },
  startingLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced'], required: true },
  roadmap: {
    phases: [phaseSchema]
  },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('CareerPath', careerPathSchema);