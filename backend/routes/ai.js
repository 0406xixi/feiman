// routes/ai.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  evaluateFeynmanAttempt,
  generateQuestion,
  answerWithRAG,
} = require('../controllers/aiController');

router.post('/evaluate', auth, evaluateFeynmanAttempt);
router.post('/generate-question', auth, generateQuestion);
router.post('/rag-qa', auth, answerWithRAG);

module.exports = router;