// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import apiClient from '../api/axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

function DashboardPage() {
  const [knowledgePoints, setKnowledgePoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const location = useLocation();

  useEffect(() => {
    const fetchKnowledgePoints = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/knowledge-points');
        setKnowledgePoints(response.data);
      } catch (err) {
        setError('获取知识点失败');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchKnowledgePoints();
  }, [location.pathname]);

  const handleDelete = async (id) => {
    if (window.confirm('你确定要删除这个知识点吗？')) {
      try {
        await apiClient.delete(`/knowledge-points/${id}`);
        setKnowledgePoints(knowledgePoints.filter((kp) => kp._id !== id));
      } catch (error) {
        console.error('删除失败', error);
      }
    }
  };

  if (loading) return <p>加载中...</p>;
  if (error) return <p className="error-msg">{error}</p>;

  // 根据搜索关键词过滤
  const filteredKps = knowledgePoints.filter((kp) => {
    const keyword = search.toLowerCase();
    return (
      kp.title.toLowerCase().includes(keyword) ||
      kp.content.toLowerCase().includes(keyword)
    );
  });

  return (
    <div>
      <h1 className="page-title">我的知识点</h1>

      <Link to="/kp/new" className="btn btn-primary">
        + 新建知识点
      </Link>

      {/* 搜索框 */}
      <input
        type="text"
        className="search-bar"
        placeholder="🔍 搜索标题或内容..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {knowledgePoints.length === 0 ? (
        <div className="empty-state">你还没有任何知识点，快去创建一个吧！</div>
      ) : filteredKps.length === 0 ? (
        <div className="empty-state">没有找到匹配「{search}」的知识点</div>
      ) : (
        filteredKps.map((kp) => (
          <div
            key={kp._id}
            className="kp-card"
            style={
              kp.reviewList
                ? {
                    borderLeft: '4px solid #e74c3c',
                    background: '#fef5f5',
                  }
                : {}
            }
          >
            <h2 className="kp-title">
              {kp.title}
              {kp.reviewList && (
                <span
                  style={{
                    color: '#e74c3c',
                    marginLeft: '0.8rem',
                    fontSize: '0.85rem',
                    fontWeight: 'normal',
                    background: '#fdecea',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '10px',
                  }}
                >
                  ⚠️ 需复习
                </span>
              )}
            </h2>

            <span className={`kp-status ${kp.status}`}>状态: {kp.status}</span>

            <div className="kp-content markdown-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {kp.content}
              </ReactMarkdown>
            </div>

            <div className="kp-actions">
              <Link to={`/feynman/${kp._id}`} className="btn btn-primary">
                🎤 开始复述
              </Link>
              <Link to={`/quiz/${kp._id}`} className="btn btn-secondary">
                📝 开始测评
              </Link>
              <Link to={`/kp/edit/${kp._id}`} className="btn btn-secondary">
                编辑
              </Link>
              <button
                onClick={() => handleDelete(kp._id)}
                className="btn btn-danger"
              >
                删除
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default DashboardPage;