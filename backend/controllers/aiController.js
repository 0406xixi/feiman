// controllers/aiController.js
const {
  evaluateWithMultipleLLMs,
  generateQuestionWithMultipleLLMs,
} = require('../utils/multiLlmManager');
const { queryVectorStore } = require('../services/vectorStoreService');
const axios = require('axios');

// ========================================
// 1. AI 评估复述
// ========================================
exports.evaluateFeynmanAttempt = async (req, res) => {
  const { originalContent, transcribedText, knowledgePoint } = req.body;
  if (!originalContent || !transcribedText) {
    return res.status(400).json({ msg: 'originalContent 和 transcribedText 是必填项' });
  }
  try {
    console.log('🤖 开始 AI 评估...');
    const result = await evaluateWithMultipleLLMs(
      knowledgePoint || '未命名知识点',
      originalContent,
      transcribedText
    );
    console.log(`✅ 评估完成，服务提供方: ${result.provider}`);
    res.json(result);
  } catch (error) {
    console.error('❌ AI 评估失败:', error.message);
    res.status(500).json({ msg: 'AI 评估失败', error: error.message });
  }
};

// ========================================
// 2. AI 出题
// ========================================
exports.generateQuestion = async (req, res) => {
  const { knowledgePointContent, difficulty } = req.body;
  if (!knowledgePointContent || !difficulty) {
    return res.status(400).json({ msg: 'knowledgePointContent 和 difficulty 是必填项' });
  }
  try {
    console.log(`🤖 开始 AI 出题（难度：${difficulty}）...`);
    const result = await generateQuestionWithMultipleLLMs(knowledgePointContent, difficulty);
    console.log(`✅ 出题完成，服务方: ${result.provider}`);
    res.json(result);
  } catch (error) {
    console.error('❌ AI 出题失败:', error.message);
    res.status(500).json({ msg: 'AI 出题失败', error: error.message });
  }
};

// ========================================
// 3. RAG 问答（检索 + 生成）
// ========================================
// ========================================
// 3. RAG 问答（支持多轮对话）
// ========================================
exports.answerWithRAG = async (req, res) => {
  const { question, history } = req.body;  // ← 新增 history
  if (!question) {
    return res.status(400).json({ msg: 'question 是必填项' });
  }

  try {
    console.log(`\n🤖 RAG 问答：${question}`);
    if (history && history.length > 0) {
      console.log(`   包含 ${history.length} 条历史消息`);
    }

    // 1. 从向量库检索相关文档
    // ⚠️ 关键：检索时，如果问题太短/太泛，可以结合最近的历史问题
    const relevantDocs = await queryVectorStore(question);
    if (relevantDocs.length === 0) {
      return res.json({
        answer: '抱歉，我的知识库里还没有相关内容。请先添加相关的知识点。',
        sources: [],
      });
    }

    // 2. 把文档拼成上下文
    const context = relevantDocs
      .map((doc, i) => `--- 文档 ${i + 1} ---\n${doc.pageContent}`)
      .join('\n\n');

    // 3. 构建遵循 MCP 协议的 Prompt（含历史）
    let historySection = '';
    if (history && history.length > 0) {
      historySection = '\n<conversation_history>\n';
      history.forEach((msg) => {
        const role = msg.sender === 'user' ? '用户' : 'AI';
        historySection += `${role}: ${msg.text}\n`;
      });
      historySection += '</conversation_history>\n';
    }

    const prompt = `<role>你是一个知识库问答机器人。</role>
<instruction>请根据下面提供的<context>信息来回答用户的<question>。如果上下文中没有相关信息，就明确说你不知道，不要编造答案。回答要简洁明了。你可以参考<conversation_history>理解用户问题的上下文。</instruction>
${historySection}
<context>
${context}
</context>

<question>
${question}
</question>

<answer>你的回答是：</answer>`;

    // 4. 调用 DeepSeek 官方 LLM
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error('未配置 DEEPSEEK_API_KEY');

    // ⚠️ 关键改进：用 messages 数组保存完整对话
    const messages = [
      { role: 'system', content: '你是知识库问答机器人，能记住对话上下文。' },
    ];

    // 把历史消息按 OpenAI 格式加入
    if (history && history.length > 0) {
      history.forEach((msg) => {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text,
        });
      });
    }

    // 加入当前问题（带 RAG 上下文）
    messages.push({ role: 'user', content: prompt });

    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: messages,  // ← 现在发的是完整对话历史
        temperature: 0.3,
        max_tokens: 1000,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    const answer = response.data.choices[0].message.content;
    console.log(`✅ RAG 回答完成`);

    res.json({
      answer,
      sources: relevantDocs.map((doc) => ({
        title: doc.metadata?.title || '未命名',
        content: doc.pageContent.slice(0, 200),
      })),
    });
  } catch (error) {
    console.error('❌ RAG 问答失败:', error.message);
    res.status(500).json({ msg: 'RAG 问答失败', error: error.message });
  }
};