// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // 1. 从请求头中获取 token
  const token = req.header('x-auth-token');

  // 2. 如果没带 token，拒绝
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // 3. 验证 token 是否有效
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();  // 放行
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};