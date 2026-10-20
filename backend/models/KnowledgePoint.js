// models/KnowledgePoint.js
const mongoose = require('mongoose');

const KnowledgePointSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  title: { type: String, required: true },
  content: { type: String, required: true },
  status: {
    type: String,
    default: 'not_started',  // not_started / in_progress / mastered
  },
  reviewList: { type: Boolean, default: false },
  // ✅ 新增：连续答对次数
  correctStreak: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('KnowledgePoint', KnowledgePointSchema);