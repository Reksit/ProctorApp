const mongoose = require('mongoose');

const ViolationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  details: {
    type: String,
    default: ''
  }
});

const AttemptSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  answers: {
    type: [Number], // Index of option chosen, null if skipped
    default: []
  },
  violations: [ViolationSchema],
  violationCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['completed', 'terminated'], // 'terminated' if they exceeded violation threshold and got locked out
    default: 'completed'
  },
  timeTaken: {
    type: Number, // in seconds
    default: 0
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Attempt', AttemptSchema);
