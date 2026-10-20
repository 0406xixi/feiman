// utils/multiLlmManager.js
const axios = require('axios');

// ========================================
// 通用 Prompt 模板
// ========================================
const buildPrompt = (knowledgePoint, originalContent, transcribedText) => `
你是一位资深的教育评估专家，擅长用费曼学习法评估学生对知识的理解程度。

【知识点标题】${knowledgePoint}

【知识点的标准内容】
${originalContent}

【学生的复述（语音转文字）】
${transcribedText}

请严格按下面的 JSON 格式返回评估结果（不要输出任何其他文字，不要用 markdown 代码块）：

{
  "score": 综合评分(0-100 的整数),
  "polishedText": "经过润色后的学生复述文本（保持原意，改得更通顺专业）",
  "strengths": ["优点1", "优点2", "优点3"],
  "weaknesses": ["待改进1", "待改进2"],
  "evaluation": "一段综合评语（100-200字）"
}

评分标准：
- 准确性：是否准确反映了知识点的核心
- 完整性：是否覆盖了关键内容
- 清晰度：表达是否清晰易懂
- 简洁性：是否用简单语言解释复杂概念
`;

// ========================================
// 通用响应解析（从LLM返回中提取JSON）
// ========================================
function parseLLMResponse(content, fallbackText) {
  try {
    // 尝试提取 ```json ... ``` 代码块
    const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1]);
    }

    // 尝试提取 { ... } 对象
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // 都无法解析，返回兜底
    return {
      score: 60,
      polishedText: fallbackText,
      strengths: ['AI 返回格式异常，无法解析'],
      weaknesses: ['请检查 LLM 配置或稍后重试'],
      evaluation: content.slice(0, 300),
    };
  } catch (err) {
    console.error('解析 LLM 响应失败:', err.message);
    return {
      score: 60,
      polishedText: fallbackText,
      strengths: [],
      weaknesses: [],
      evaluation: '无法解析 AI 响应，请稍后重试。',
    };
  }
}

// ========================================
// 1. 硅基流动 (SiliconFlow)
// ========================================
async function evaluateWithSiliconFlow(knowledgePoint, originalContent, transcribedText) {
  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) throw new Error('未配置 SILICONFLOW_API_KEY');

  const response = await axios.post(
    'https://api.siliconflow.cn/v1/chat/completions',
    {
      model: 'deepseek-ai/DeepSeek-V2.5',
      messages: [
        { role: 'system', content: '你是一个专业的教育评估专家，擅长用费曼学习法评估学生理解程度。' },
        { role: 'user', content: buildPrompt(knowledgePoint, originalContent, transcribedText) },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );

  const content = response.data.choices[0].message.content;
  const result = parseLLMResponse(content, transcribedText);
  result.provider = 'SiliconFlow (硅基流动)';
  result.model = 'deepseek-ai/DeepSeek-V3';
  return result;
}

// ========================================
// 2. OpenRouter
// ========================================
async function evaluateWithOpenRouter(knowledgePoint, originalContent, transcribedText) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('未配置 OPENROUTER_API_KEY');

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'deepseek/deepseek-chat',
      messages: [
        { role: 'system', content: '你是一个专业的教育评估专家，擅长用费曼学习法评估学生理解程度。' },
        { role: 'user', content: buildPrompt(knowledgePoint, originalContent, transcribedText) },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/feynman-platform',
        'X-Title': 'Feynman Platform',
      },
      timeout: 60000,
    }
  );

  const content = response.data.choices[0].message.content;
  const result = parseLLMResponse(content, transcribedText);
  result.provider = 'OpenRouter';
  result.model = 'deepseek/deepseek-chat';
  return result;
}

// ========================================
// 3. DeepSeek 官方
// ========================================
async function evaluateWithDeepSeek(knowledgePoint, originalContent, transcribedText) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('未配置 DEEPSEEK_API_KEY');

  const response = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一个专业的教育评估专家，擅长用费曼学习法评估学生理解程度。' },
        { role: 'user', content: buildPrompt(knowledgePoint, originalContent, transcribedText) },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );

  const content = response.data.choices[0].message.content;
  const result = parseLLMResponse(content, transcribedText);
  result.provider = 'DeepSeek (官方)';
  result.model = 'deepseek-chat';
  return result;
}

// ========================================
// 4. 多 LLM 管理器（智能回退）
// ========================================
async function evaluateWithMultipleLLMs(knowledgePoint, originalContent, transcribedText) {
  // 按优先级顺序尝试
  const providers = [
    { name: 'SiliconFlow', fn: evaluateWithSiliconFlow },
    { name: 'OpenRouter', fn: evaluateWithOpenRouter },
    { name: 'DeepSeek', fn: evaluateWithDeepSeek },
  ];

  const errors = [];

  for (const provider of providers) {
    try {
      console.log(`🔄 尝试使用 ${provider.name}...`);
      const startTime = Date.now();
      const result = await provider.fn(knowledgePoint, originalContent, transcribedText);
      const duration = Date.now() - startTime;

      console.log(`✅ ${provider.name} 成功，耗时 ${duration}ms，评分 ${result.score}`);
      result.duration = duration;
      return result;
    } catch (err) {
      const errMsg = `${provider.name} 失败: ${err.message}`;
      console.warn(`❌ ${errMsg}`);
      errors.push(errMsg);
    }
  }

  // 全部失败
  throw new Error(`所有 LLM 服务都失败了:\n${errors.join('\n')}`);
}

// ========================================
// 5. AI 出题（生成选择题）
// ========================================
const buildQuestionPrompt = (knowledgePointContent, difficulty) => `
你是一个专业的计算机科学出题专家。请根据以下知识点内容和指定难度，生成一个相关的单项选择题。

【知识点内容】
"""
${knowledgePointContent}
"""

【指定难度】${difficulty}（可选值：基础、中等、困难）

请严格按照以下 JSON 格式返回题目，不要包含任何其他文字和解释，不要用 markdown 代码块：
{
  "type": "single-choice",
  "difficulty": "${difficulty}",
  "question": "这里是题干",
  "options": {
    "A": "选项A的内容",
    "B": "选项B的内容",
    "C": "选项C的内容",
    "D": "选项D的内容"
  },
  "answer": "C",
  "explanation": "这里是对正确答案的简短解释"
}
`;

async function generateQuestionWithSiliconFlow(knowledgePointContent, difficulty) {
  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) throw new Error('未配置 SILICONFLOW_API_KEY');

  const response = await axios.post(
    'https://api.siliconflow.cn/v1/chat/completions',
    {
      model: 'deepseek-ai/DeepSeek-V3',
      messages: [
        { role: 'system', content: '你是计算机科学出题专家，只输出 JSON。' },
        { role: 'user', content: buildQuestionPrompt(knowledgePointContent, difficulty) },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );

  const content = response.data.choices[0].message.content;
  return parseLLMResponse(content, JSON.stringify({}));
}

async function generateQuestionWithOpenRouter(knowledgePointContent, difficulty) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('未配置 OPENROUTER_API_KEY');

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'deepseek/deepseek-chat',
      messages: [
        { role: 'system', content: '你是计算机科学出题专家，只输出 JSON。' },
        { role: 'user', content: buildQuestionPrompt(knowledgePointContent, difficulty) },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/feynman-platform',
        'X-Title': 'Feynman Platform',
      },
      timeout: 60000,
    }
  );

  const content = response.data.choices[0].message.content;
  return parseLLMResponse(content, JSON.stringify({}));
}

async function generateQuestionWithDeepSeek(knowledgePointContent, difficulty) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('未配置 DEEPSEEK_API_KEY');

  const response = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是计算机科学出题专家，只输出 JSON。' },
        { role: 'user', content: buildQuestionPrompt(knowledgePointContent, difficulty) },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );

  const content = response.data.choices[0].message.content;
  return parseLLMResponse(content, JSON.stringify({}));
}

async function generateQuestionWithMultipleLLMs(knowledgePointContent, difficulty) {
  const providers = [
    { name: 'DeepSeek', fn: generateQuestionWithDeepSeek },
    { name: 'SiliconFlow', fn: generateQuestionWithSiliconFlow },
    { name: 'OpenRouter', fn: generateQuestionWithOpenRouter },
  ];

  const errors = [];

  for (const provider of providers) {
    try {
      console.log(`🔄 尝试使用 ${provider.name} 生成题目...`);
      const startTime = Date.now();
      const result = await provider.fn(knowledgePointContent, difficulty);
      const duration = Date.now() - startTime;
      console.log(`✅ ${provider.name} 出题成功，耗时 ${duration}ms`);
      result.provider = provider.name;
      result.duration = duration;
      return result;
    } catch (err) {
      const errMsg = `${provider.name} 失败: ${err.message}`;
      console.warn(`❌ ${errMsg}`);
      errors.push(errMsg);
    }
  }

  throw new Error(`所有 LLM 服务都失败了:\n${errors.join('\n')}`);
}

module.exports = {
  evaluateWithMultipleLLMs,
  generateQuestionWithMultipleLLMs,   // ← 新增
  evaluateWithSiliconFlow,
  evaluateWithOpenRouter,
  evaluateWithDeepSeek,
};