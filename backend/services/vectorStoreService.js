// services/vectorStoreService.js
const { HNSWLib } = require('@langchain/community/vectorstores/hnswlib');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const path = require('path');

const VECTOR_STORE_PATH = path.join(__dirname, '../vector_store');

// ========================================
// 使用硅基流动的免费 Embedding 模型
// ========================================
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.SILICONFLOW_API_KEY,
  configuration: {
    baseURL: 'https://api.siliconflow.cn/v1',
  },
  modelName: 'Qwen/Qwen3-Embedding-0.6B',
});

// 文本分割器
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50,
});

// ========================================
// 添加知识点到向量库
// ========================================
exports.addKnowledgePointToStore = async (knowledgePoint) => {
  try {
    console.log(`📚 正在为知识点 ${knowledgePoint._id} 创建向量...`);

    const docs = await textSplitter.createDocuments(
      [knowledgePoint.content],
      [{ knowledgePointId: knowledgePoint._id.toString(), title: knowledgePoint.title }]
    );

    console.log(`   → 分割成 ${docs.length} 个文本块`);

    let vectorStore;
    try {
      vectorStore = await HNSWLib.load(VECTOR_STORE_PATH, embeddings);
      await vectorStore.addDocuments(docs);
      console.log('   → 向已有向量库追加了新文档');
    } catch (e) {
      console.log('   → 未找到向量库，正在创建新的...');
      vectorStore = await HNSWLib.fromDocuments(docs, embeddings);
    }

    await vectorStore.save(VECTOR_STORE_PATH);
    console.log(`✅ 知识点 ${knowledgePoint._id} 向量已保存`);
  } catch (error) {
    console.error('❌ 添加到向量库失败:', error.message);
    if (error.response) {
      console.error('   响应详情:', error.response.data);
    }
  }
};

// ========================================
// 从向量库检索相关文档（RAG 用）
// ========================================
exports.queryVectorStore = async (query) => {
  try {
    const vectorStore = await HNSWLib.load(VECTOR_STORE_PATH, embeddings);
    const retriever = vectorStore.asRetriever(4);
    const relevantDocs = await retriever.invoke(query);
    console.log(`🔍 为问题 "${query}" 检索到 ${relevantDocs.length} 个相关文档`);
    return relevantDocs;
  } catch (error) {
    console.error('从向量库检索失败:', error.message);
    if (error.message.includes('No such file or directory')) {
      return [];
    }
    throw error;
  }
};