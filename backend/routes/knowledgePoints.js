// routes/knowledgePoints.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const KnowledgePoint = require('../models/KnowledgePoint');
const { addKnowledgePointToStore } = require('../services/vectorStoreService');

// ========================================
// CREATE - 创建知识点
// ========================================
router.post('/', auth, async (req, res) => {
  try {
    const { title, content } = req.body;
    const newKp = new KnowledgePoint({
      title,
      content,
      user: req.user.id,
    });
    const kp = await newKp.save();

    addKnowledgePointToStore(kp);

    res.json(kp);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ========================================
// READ - 获取当前用户所有知识点
// ========================================
router.get('/', auth, async (req, res) => {
  try {
    const kps = await KnowledgePoint.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(kps);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ========================================
// READ - 获取单个知识点
// ========================================
router.get('/:id', auth, async (req, res) => {
  try {
    const kp = await KnowledgePoint.findById(req.params.id);
    if (!kp) return res.status(404).json({ msg: 'Knowledge point not found' });
    if (kp.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    res.json(kp);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ========================================
// UPDATE - 更新知识点（支持 correctStreak）
// ========================================
router.put('/:id', auth, async (req, res) => {
  try {
    let kp = await KnowledgePoint.findById(req.params.id);
    if (!kp) return res.status(404).json({ msg: 'Knowledge point not found' });
    if (kp.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    const { title, content, status, reviewList, correctStreak } = req.body;

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (content !== undefined) updateFields.content = content;
    if (status !== undefined) updateFields.status = status;
    if (reviewList !== undefined) updateFields.reviewList = reviewList;
    if (correctStreak !== undefined) updateFields.correctStreak = correctStreak;

    kp = await KnowledgePoint.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    // 内容变更时，重新索引到向量库
    if (content !== undefined) {
      addKnowledgePointToStore(kp);
    }

    res.json(kp);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ========================================
// DELETE - 删除知识点
// ========================================
router.delete('/:id', auth, async (req, res) => {
  try {
    let kp = await KnowledgePoint.findById(req.params.id);
    if (!kp) return res.status(404).json({ msg: 'Knowledge point not found' });
    if (kp.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    await KnowledgePoint.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Knowledge point removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;