const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher'], required: true },
  // Optional institute-specific fields for enrollment and analytics
  institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute' },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  rollNo: String,
  parentContact: {
    name: String,
    phone: String,
  },
  assignedSubjects: [String],
  activeStatus: { type: String, enum: ['active', 'inactive', 'pendingDocs'], default: 'active' },
  aiProfile: {
    learningPace: String,
    preferredStudyStyle: String,
    weakAreas: [String],
  },
  profile: {
    avatar: String,
    bio: String,
    grade: String,
    subjects: [String],
    learningStyle: String,
    language: { type: String, default: 'en' } // Added language preference
  },
  progress: {
    completedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    currentStreak: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    achievements: [String]
  },
  preferences: {
    language: { type: String, default: 'english' },
    difficulty: { type: String, default: 'beginner' },
    studyTime: String
  },
  refreshTokenHash: { type: String }, // For refresh token rotation
  learningProfile: { type: mongoose.Schema.Types.Mixed } // For storing AI-generated learning profiles
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Method to set refresh token hash
userSchema.methods.setRefreshTokenHash = async function(token) {
  const salt = await bcrypt.genSalt(12);
  this.refreshTokenHash = await bcrypt.hash(token, salt);
  return this.save();
};

// Method to validate refresh token
userSchema.methods.validateRefreshToken = async function(token) {
  if (!this.refreshTokenHash) return false;
  return await bcrypt.compare(token, this.refreshTokenHash);
};

module.exports = mongoose.model('User', userSchema);