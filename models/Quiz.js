const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true
  },
  isCode: {
    type: Boolean,
    default: false
  },
  options: {
    type: [String],
    required: true,
    validate: [arr => arr.length >= 2 && arr.length <= 4, 'Must have between 2 and 4 options']
  },
  correctAnswer: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  explanation: {
    type: String,
    default: ''
  }
});

const QuizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  questions: [QuestionSchema],
  timeLimit: {
    type: Number, // in minutes
    default: 30
  },
  assignedDate: {
    type: String, // format YYYY-MM-DD
    required: true,
    default: () => new Date().toISOString().split('T')[0]
  },
  startTime: {
    type: String, // format HH:MM (24h)
    default: '00:00'
  },
  endTime: {
    type: String, // format HH:MM (24h)
    default: '23:59'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Quiz', QuizSchema);
