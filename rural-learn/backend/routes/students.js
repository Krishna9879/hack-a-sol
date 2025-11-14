const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// GET /api/student/me
// Purpose: get student profile & preferences
router.get('/me', auth, async (req, res) => {
  try {
    // Return user profile excluding sensitive information
    const user = req.user;
    
    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      language: user.profile?.language || 'en',
      learningProfile: user.learningProfile || {}
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/student/me
// Purpose: update profile (name, language, learning style)
router.put('/me', auth, async (req, res) => {
  try {
    const user = req.user;
    const updates = req.body;
    
    // Update allowed fields only
    const allowedUpdates = ['name', 'language', 'learningProfile'];
    const requestedUpdates = Object.keys(updates);
    const isValidOperation = requestedUpdates.every((update) => 
      allowedUpdates.includes(update)
    );
    
    if (!isValidOperation) {
      return res.status(400).json({
        success: false,
        message: 'Invalid updates!'
      });
    }
    
    // Apply updates
    if (updates.name) {
      user.name = updates.name;
    }
    
    if (updates.language) {
      user.profile = user.profile || {};
      user.profile.language = updates.language;
      user.preferences = user.preferences || {};
      user.preferences.language = updates.language === 'en' ? 'english' : 'hindi';
    }
    
    if (updates.learningProfile) {
      user.learningProfile = updates.learningProfile;
    }
    
    await user.save();
    
    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      language: user.profile?.language || 'en',
      learningProfile: user.learningProfile || {}
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;