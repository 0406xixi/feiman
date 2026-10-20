// src/pages/QuizPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';

function QuizPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [knowledgePoint, setKnowledgePoint] = useState(null);
  const [question, setQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 用于展示当前进度（连续答对次数 / 状态）
  const [progress, setProgress] = useState(null);

  // 加载知识点
  useEffect(() => {
    const fetchKp = async () => {
      try {
        const response = await apiClient.get(`/knowledge-points/${id}`);
        setKnowledgePoint(response.data);
      } catch (err) {
        console.error(err);
        setError('获取知识点失败');
      }
    };
    fetchKp();
  }, [id]);

  // 获取题目
  const fetchQuestion = async (difficulty) => {
    if (!knowledgePoint) return;
    setIsLoading(true);
    setQuestion(null);
    setResult(null);
    setSelectedOption('');
    setError('');
    setProgress(null);
    try {
      const response = await apiClient.post('/ai/generate-question', {
        knowledgePointContent: knowledgePoint.content,
        difficulty: difficulty,
      });
      setQuestion(response.data);
    } catch (err) {
      console.error(err);
      setError('AI 出题失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // 提交答案（连续答对 3 题 → 已掌握）
  // ========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOption) {
      alert('请选择一个答案！');
      return;
    }
    const isCorrect = selectedOption === question.answer;
    setResult({ isCorrect, explanation: question.explanation });

    try {
      // 拉取最新状态
      const kpResponse = await apiClient.get(`/knowledge-points/${id}`);
      const currentKp = kpResponse.data;
      const currentStreak = currentKp.correctStreak || 0;
      const currentStatus = currentKp.status;

      let newStreak;
      let newStatus;
      let newReviewList;

      if (isCorrect) {
        newStreak = currentStreak + 1;
        newReviewList = false;

        if (newStreak >= 3) {
          newStatus = 'mastered';       // 连续答对 3 题 → 已掌握
        } else {
          // 不足 3 题：保持原状态（不能因为答对而"降级"）
          newStatus = currentStatus === 'mastered' ? 'mastered' : currentStatus;
        }
      } else {
        newStreak = 0;
        newStatus = 'in_progress';      // 答错 → 需复习
        newReviewList = true;
      }

      await apiClient.put(`/knowledge-points/${id}`, {
        status: newStatus,
        reviewList: newReviewList,
        correctStreak: newStreak,
      });

      setProgress({
        isCorrect,
        newStreak,
        remaining: Math.max(0, 3 - newStreak),
        finalStatus: newStatus,
      });

      console.log(
        `📊 状态更新：连续答对 ${newStreak} 次，status=${newStatus}，reviewList=${newReviewList}`
      );
    } catch (err) {
      console.error('更新知识点状态失败', err);
    }
  };

  if (!knowledgePoint) return <p>加载知识点信息...</p>;

  return (
    <div>
      <h1 className="page-title">知识点测评: {knowledgePoint.title}</h1>

      {/* 当前状态显示 */}
      <div style={{ background: '#eef5ff', padding: '0.8rem 1.2rem', borderRadius: '8px', marginBottom: '1.5rem', color: '#333' }}>
        当前状态：
        <strong style={{ marginLeft: '0.4rem' }}>
          {knowledgePoint.status === 'mastered'
            ? '🟢 已掌握'
            : knowledgePoint.reviewList
            ? '🟠 需复习'
            : '🔵 普通'}
        </strong>
        <span style={{ marginLeft: '1rem', color: '#666' }}>
          连续答对：{knowledgePoint.correctStreak || 0} / 3
        </span>
      </div>

      {/* 难度选择 */}
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
        <p style={{ marginBottom: '0.8rem', fontWeight: 'bold' }}>选择难度:</p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-primary" onClick={() => fetchQuestion('基础')}>基础</button>
          <button className="btn btn-primary" onClick={() => fetchQuestion('中等')}>中等</button>
          <button className="btn btn-primary" onClick={() => fetchQuestion('困难')}>困难</button>
        </div>
      </div>

      {isLoading && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '10px' }}>
          <p style={{ color: '#4a90e2' }}>🧠 AI 正在出题中，请稍候...</p>
        </div>
      )}

      {error && (
        <div style={{ background: '#fdecea', padding: '1.5rem', borderRadius: '10px', color: '#e74c3c' }}>
          ❌ {error}
        </div>
      )}

      {/* 题目 */}
      {question && !result && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '10px' }}>
          <h3 style={{ marginBottom: '1rem' }}>{question.question}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {Object.entries(question.options).map(([key, value]) => (
                <label
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.6rem 1rem',
                    border: '1px solid #e8ecf0',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: selectedOption === key ? '#eef5ff' : 'white',
                  }}
                >
                  <input
                    type="radio"
                    name="option"
                    value={key}
                    checked={selectedOption === key}
                    onChange={(e) => setSelectedOption(e.target.value)}
                  />
                  <span><strong>{key}.</strong> {value}</span>
                </label>
              ))}
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
              提交答案
            </button>
          </form>
        </div>
      )}

      {/* 结果 */}
      {result && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '10px' }}>
          <h2>测评结果</h2>
          <p
            style={{
              color: result.isCorrect ? '#27ae60' : '#e74c3c',
              fontWeight: 'bold',
              fontSize: '1.3rem',
              margin: '1rem 0',
            }}
          >
            {result.isCorrect ? '✅ 回答正确！' : '❌ 回答错误！'}
          </p>
          <p><strong>正确答案：</strong>{question.answer}</p>
          <p style={{ marginTop: '0.8rem' }}><strong>解释：</strong>{result.explanation}</p>

          {/* 进度反馈 */}
          {progress && (
            <div style={{ marginTop: '1rem', padding: '0.8rem 1rem', borderRadius: '8px', background: '#f9f9f9' }}>
              {progress.isCorrect ? (
                progress.newStreak >= 3 ? (
                  <p style={{ color: '#27ae60', margin: 0 }}>
                    🎉🎉 恭喜！连续答对 3 题，本知识点已标记为 <strong>「已掌握」</strong>。
                  </p>
                ) : (
                  <p style={{ color: '#27ae60', margin: 0 }}>
                    🎉 连续答对 {progress.newStreak} 题，再答对 <strong>{progress.remaining} 题</strong>即可掌握本知识点。
                  </p>
                )
              ) : (
                <p style={{ color: '#e67e22', margin: 0 }}>
                  ⚠️ 答错了，连续答对次数已重置为 0。本知识点已加入 <strong>复习列表</strong>。
                </p>
              )}
            </div>
          )}

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
            <button className="btn btn-primary" onClick={() => fetchQuestion(question.difficulty)}>
              再来一题
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>
              返回主页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuizPage;