const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const metricsMiddleware = require('./middleware/metricsMiddleware');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(metricsMiddleware);

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/student', require('./routes/students'));
app.use('/api/student/roadmap', require('./routes/roadmaps'));
app.use('/api/student/lesson', require('./routes/lessons'));
app.use('/api/student/quiz', require('./routes/quizzes'));
app.use('/api/student/mock-test', require('./routes/mockTests'));
app.use('/api/student/career-path', require('./routes/careerPaths'));
app.use('/api/student/progress', require('./routes/progress'));
app.use('/api/teachers', require('./routes/teachers'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/career', require('./routes/career'));
app.use('/api/metrics', require('./routes/metrics'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Institute module routes
app.use('/api/institute/students', require('./routes/instituteStudents'));
app.use('/api/institute/tests', require('./routes/instituteTests'));
app.use('/api/institute/performance', require('./routes/institutePerformance'));
app.use('/api/institute/paper', require('./routes/institutePaper'));
app.use('/api/institute/material', require('./routes/instituteMaterial'));
app.use('/api/institute/notes', require('./routes/instituteNotes'));
app.use('/api/institute/exam', require('./routes/instituteExam'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});