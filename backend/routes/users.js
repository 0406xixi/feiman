// routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ========================================
// 用户注册 API
// POST /api/users/register
// ========================================
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 1. 检查邮箱是否已存在
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // 2. 创建新用户实例
    user = new User({ username, email, password });

    // 3. 对密码进行哈希加密
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // 4. 保存到数据库
    await user.save();

    // 5. 注册成功后，生成 JWT 并返回（实现自动登录）
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ========================================
// 用户登录 API
// POST /api/users/login
// ========================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. 检查用户是否存在
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // 2. 比较密码（bcrypt.compare 会自动处理盐值）
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // 3. 登录成功，生成 JWT
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;