// src/pages/AgentPage.jsx
import { useState, useRef, useEffect } from 'react';
import apiClient from '../api/axios';
import './AgentPage.css';

function AgentPage() {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: '你好！我是你的专属知识库 AI 助手。有什么可以帮你的吗？' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
  e.preventDefault();
  if (!inputValue.trim() || isLoading) return;

  const userMessage = { sender: 'user', text: inputValue };
  const updatedMessages = [...messages, userMessage];  // 包含新消息的完整历史
  setMessages(updatedMessages);
  setInputValue('');
  setIsLoading(true);

  try {
    // ⚠️ 关键：把历史消息一起发给后端（排除第一条欢迎语）
    const historyForBackend = updatedMessages
      .filter((msg) => !(msg.sender === 'bot' && msg.text.includes('你好！我是你的专属知识库')))
      .slice(0, -1)  // 去掉刚刚添加的当前问题（因为后端会单独接收 question）
      .map((msg) => ({
        sender: msg.sender,
        text: msg.text,
      }));

    const response = await apiClient.post('/ai/rag-qa', {
      question: inputValue,
      history: historyForBackend,  // ← 新增
    });

    const botMessage = {
      sender: 'bot',
      text: response.data.answer,
      sources: response.data.sources || [],
    };
    setMessages((prev) => [...prev, botMessage]);
  } catch (error) {
    console.error('Error:', error);
    setMessages((prev) => [
      ...prev,
      { sender: 'bot', text: '抱歉，我遇到了一些问题，请稍后再试。' },
    ]);
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="agent-page">
      <h1 className="page-title">🤖 AI 知识库助手</h1>

      <div className="chat-window">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            <div className="message-bubble">
              {msg.text}
              {msg.sources && msg.sources.length > 0 && (
                <div className="sources">
                  <details>
                    <summary>📚 参考来源（{msg.sources.length}）</summary>
                    <ul>
                      {msg.sources.map((s, i) => (
                        <li key={i}>
                          <strong>{s.title}:</strong> {s.content}...
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message bot">
            <div className="message-bubble typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="在这里输入你的问题..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? '思考中...' : '发送'}
        </button>
      </form>
    </div>
  );
}

export default AgentPage;