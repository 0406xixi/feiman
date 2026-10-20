// routes/audio.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const { transcribeAudio } = require('../controllers/baiduAiController');

// 内存存储（不落盘，直接传给百度API）
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/audio/transcribe
router.post(
  '/transcribe',
  auth,
  upload.single('audio'),
  transcribeAudio
);

module.exports = router;