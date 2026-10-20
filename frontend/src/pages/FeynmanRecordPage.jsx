// src/pages/FeynmanRecordPage.jsx
import { useReactMediaRecorder } from 'react-media-recorder';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import apiClient from '../api/axios';

function FeynmanRecordPage() {
  const { id } = useParams();
  const [kpTitle, setKpTitle] = useState('');
  const [kpContent, setKpContent] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // 获取知识点标题和内容
  useEffect(() => {
    const fetchKp = async () => {
      try {
        const response = await apiClient.get(`/knowledge-points/${id}`);
        setKpTitle(response.data.title);
        setKpContent(response.data.content);
      } catch (err) {
        console.error('获取知识点失败', err);
      }
    };
    fetchKp();
  }, [id]);

  // 上传音频并转录
  const uploadAudio = async (blobUrl) => {
    setIsUploading(true);
    setTranscribedText('');
    setAiFeedback(null);
    try {
      const audioBlob = await fetch(blobUrl).then((r) => r.blob());
      const audioFile = new File([audioBlob], `feynman-record-${id}.wav`, {
        type: 'audio/wav',
      });

      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('knowledgePointId', id);

      const response = await apiClient.post('/audio/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const text = response.data.result;
      setTranscribedText(text);

      // 转录成功后，自动调用 AI 评估
      if (text) {
        getAiEvaluation(text);
      }
    } catch (error) {
      console.error('上传或转录失败', error);
      setTranscribedText('转录失败，请重试。');
    } finally {
      setIsUploading(false);
    }
  };

  // 获取 AI 评价
  const getAiEvaluation = async (transcribed) => {
    setIsEvaluating(true);
    setAiFeedback(null);
    try {
      const feedbackResponse = await apiClient.post('/ai/evaluate', {
        originalContent: kpContent,
        transcribedText: transcribed,
        knowledgePoint: kpTitle,
      });
      setAiFeedback(feedbackResponse.data);
    } catch (error) {
      console.error('获取AI评价失败', error);
      setAiFeedback({
        error: true,
        evaluation: 'AI 评估失败，请稍后重试。',
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  // 录音 Hook
  const {
    status: recStatus,
    startRecording: recStart,
    stopRecording: recStop,
    mediaBlobUrl: recUrl,
  } = useReactMediaRecorder({
    audio: true,
    onStop: (blobUrl) => {
      uploadAudio(blobUrl);
    },
  });

  return (
    <div>
      <h1 className="page-title">复述知识点: {kpTitle}</h1>

      {/* 录音区 */}
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
        <p style={{ marginBottom: '1rem' }}>
          录音状态：
          <span style={{ color: recStatus === 'recording' ? 'red' : '#666', fontWeight: 'bold' }}>
            {recStatus === 'recording' ? '● 录音中...' : recStatus}
          </span>
        </p>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={recStart} disabled={recStatus === 'recording'} className="btn btn-primary">
            🎤 开始录音
          </button>
          <button onClick={recStop} disabled={recStatus !== 'recording'} className="btn btn-danger">
            ⏹ 停止录音
          </button>
        </div>

        {recUrl && (
          <div style={{ marginTop: '1rem' }}>
            <p>回放录音：</p>
            <audio src={recUrl} controls />
          </div>
        )}
      </div>

      {/* 转录结果 */}
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>🤖 AI 转录结果</h2>
        {isUploading && <p style={{ color: '#4a90e2' }}>正在上传并转录，请稍候...</p>}
        <div
          style={{
            border: '1px solid #e8ecf0',
            padding: '1rem',
            minHeight: '80px',
            background: '#f9f9f9',
            borderRadius: '6px',
            lineHeight: '1.8',
          }}
        >
          {transcribedText || <span style={{ color: '#999' }}>等待转录结果...</span>}
        </div>
      </div>

      {/* AI 反馈 */}
      {isEvaluating && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '10px' }}>
          <p style={{ color: '#4a90e2' }}>🧠 AI 教练正在批阅您的答卷...</p>
        </div>
      )}

      {aiFeedback && !aiFeedback.error && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>🧠 AI 教练反馈</h2>
            <span style={{ fontSize: '0.85rem', color: '#666', background: '#f0f0f0', padding: '0.3rem 0.8rem', borderRadius: '12px' }}>
              服务方: {aiFeedback.provider} ({aiFeedback.model})
            </span>
          </div>

          {/* 分数 */}
          <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
            <div
              style={{
                fontSize: '4rem',
                fontWeight: 'bold',
                color: aiFeedback.score >= 80 ? '#27ae60' : aiFeedback.score >= 60 ? '#f39c12' : '#e74c3c',
              }}
            >
              {aiFeedback.score}
            </div>
            <p style={{ color: '#666' }}>综合得分</p>
          </div>

          {/* 润色文本 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>✨ 润色后的文本</h3>
            <div style={{ background: '#eef5ff', padding: '1rem', borderRadius: '6px', lineHeight: '1.8' }}>
              {aiFeedback.polishedText}
            </div>
          </div>

          {/* 优点 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.5rem', color: '#27ae60' }}>👍 优点</h3>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
              {aiFeedback.strengths?.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          {/* 待改进 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.5rem', color: '#e67e22' }}>📝 待改进</h3>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
              {aiFeedback.weaknesses?.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          {/* 综合评语 */}
          <div>
            <h3 style={{ marginBottom: '0.5rem' }}>💬 综合评语</h3>
            <div style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '6px', lineHeight: '1.8' }}>
              {aiFeedback.evaluation}
            </div>
          </div>
        </div>
      )}

      {aiFeedback?.error && (
        <div style={{ background: '#fdecea', padding: '1.5rem', borderRadius: '10px', color: '#e74c3c' }}>
          ❌ {aiFeedback.evaluation}
        </div>
      )}

      <a href="/" style={{ display: 'inline-block', marginTop: '1.5rem', color: '#4a90e2' }}>
        ← 返回主页
      </a>
    </div>
  );
}

export default FeynmanRecordPage;