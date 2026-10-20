// src/pages/KnowledgePointFormPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import MDEditor from '@uiw/react-md-editor';

function KnowledgePointFormPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  // 如果是编辑模式，加载已有数据
  useEffect(() => {
    if (isEditing) {
      const fetchKp = async () => {
        try {
          const response = await apiClient.get(`/knowledge-points/${id}`);
          setTitle(response.data.title);
          setContent(response.data.content);
        } catch (err) {
          console.error('加载知识点失败', err);
        }
      };
      fetchKp();
    }
  }, [id, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const kpData = { title, content };
    try {
      if (isEditing) {
        await apiClient.put(`/knowledge-points/${id}`, kpData);
      } else {
        await apiClient.post('/knowledge-points', kpData);
      }
      navigate('/');
    } catch (error) {
      console.error('保存知识点失败', error);
    }
  };

  return (
    <div>
      <h1>{isEditing ? '编辑知识点' : '新建知识点'}</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>标题:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            required
          />
        </div>
        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          <label>内容 (支持 Markdown):</label>
          <MDEditor
            value={content}
            onChange={(val) => setContent(val || '')}
            height={300}
          />
        </div>
        <button type="submit" style={{ padding: '8px 20px' }}>
          {isEditing ? '更新' : '创建'}
        </button>
      </form>
    </div>
  );
}

export default KnowledgePointFormPage;