// routes/graph.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const KnowledgePoint = require('../models/KnowledgePoint');

// GET /api/graph/knowledge-map
// 获取知识图谱数据（节点 + 边）
router.get('/knowledge-map', auth, async (req, res) => {
  try {
    const kps = await KnowledgePoint.find({ user: req.user.id });

    if (kps.length === 0) {
      return res.json({ nodes: [], links: [] });
    }

    // 1. 生成节点
    const nodes = kps.map((kp) => ({
      id: kp._id.toString(),
      name: kp.title,
      value: kp.content.substring(0, 100),
      symbolSize: 20 + Math.min(kp.content.length / 50, 30),
      status: kp.status,
      reviewList: kp.reviewList,
      correctStreak: kp.correctStreak || 0,   // ← 新增
    }));

    // 2. 生成边（如果 A 的内容里包含 B 的标题，就建立 A → B 的边）
    const links = [];
    const titleMap = new Map(kps.map((kp) => [kp.title, kp._id.toString()]));

    for (const sourceKp of kps) {
      for (const targetTitle of titleMap.keys()) {
        if (sourceKp.title === targetTitle) continue;
        if (sourceKp.content.includes(targetTitle)) {
          links.push({
            source: sourceKp._id.toString(),
            target: titleMap.get(targetTitle),
            label: { show: true, formatter: '引用' },
          });
        }
      }
    }

    console.log(`🕸 生成知识图谱：${nodes.length} 个节点，${links.length} 条边`);
    res.json({ nodes, links });
  } catch (error) {
    console.error('生成知识图谱失败:', error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;