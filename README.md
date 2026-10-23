# 费曼学习平台 (Feynman Learning Platform)

基于 React + Node.js + MongoDB + LLM 的智能学习平台。

## 功能
- 用户注册 / 登录（JWT 认证）
- 知识点管理（Markdown / LaTeX 渲染）
- 语音识别（百度 ASR）
- AI 文本评价 / 出题 / 测评（DeepSeek / 硅基流动）
- RAG 私有知识库问答
- 多轮对话记忆
- 知识图谱可视化（ECharts）

## 技术栈
- **前端**：React + Vite + React Router + Axios + ECharts
- **后端**：Node.js + Express + Mongoose + LangChain
- **数据库**：MongoDB Atlas
- **AI 服务**：DeepSeek API / 硅基流动 API / 百度 ASR

## 本地运行
http://localhost:5173/

## GitHub仓库
https://github.com/0406xixi/feiman

### 后端
```bash
cd backend
npm install
# 配置 .env 文件（参考 .env.example）
node index.js