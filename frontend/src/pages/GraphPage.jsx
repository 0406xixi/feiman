// src/pages/GraphPage.jsx
import { useEffect, useState } from 'react';
import apiClient from '../api/axios';
import ReactECharts from 'echarts-for-react';
import { useNavigate } from 'react-router-dom';

function GraphPage() {
  const [option, setOption] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get('/graph/knowledge-map');
        const { nodes, links } = response.data;

        if (nodes.length === 0) {
          setError('你还没有任何知识点，先去创建一些吧！');
          setLoading(false);
          return;
        }

        const coloredNodes = nodes.map((node) => {
          let color = '#5B8FF9';
          if (node.status === 'mastered') color = '#52c41a';
          else if (node.reviewList) color = '#fa8c16';
          return { ...node, itemStyle: { color } };
        });

        const chartOption = {
          tooltip: {
            formatter: (params) => {
              if (params.dataType === 'node') {
                const node = params.data;
                const statusMap = {
                  not_started: '未开始',
                  in_progress: '学习中',
                  mastered: '已掌握',
                };
                return `
                  <div style="font-weight: bold; margin-bottom: 6px;">${node.name}</div>
                  <div>状态: <strong>${statusMap[node.status] || node.status}</strong></div>
                  <div>连续答对: ${node.correctStreak || 0} / 3</div>
                  ${node.reviewList ? '<div style="color: #fa8c16;">⚠️ 需复习</div>' : ''}
      
                `;
              }
              return '引用';
            },
          },
          series: [
            {
              type: 'graph',
              layout: 'force',
              data: coloredNodes,
              links,
              roam: true,
              draggable: true,
              edgeSymbol: ['circle', 'arrow'],
              edgeSymbolSize: [4, 10],
              label: { show: true, position: 'right', formatter: '{b}', fontSize: 12 },
              force: { repulsion: 200, edgeLength: [80, 150], gravity: 0.1 },
              emphasis: { focus: 'adjacency', lineStyle: { width: 3 } },
              lineStyle: { color: '#aaa', curveness: 0.1, width: 1.5 },
              edgeLabel: { show: true, formatter: '引用', fontSize: 10, color: '#999' },
            },
          ],
        };
        setOption(chartOption);
      } catch (err) {
        console.error('获取图谱数据失败', err);
        setError('获取图谱数据失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const onChartClick = (params) => {
    if (params.dataType === 'node') {
      navigate(`/kp/edit/${params.data.id}`);
    }
  };

  if (loading) return <p>正在生成知识图谱...</p>;
  if (error) return <p className="error-msg">{error}</p>;

  return (
    <div>
      <h1 className="page-title">🕸 知识图谱</h1>
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        展示知识点之间的引用关系。节点颜色：
        <span style={{ color: '#52c41a' }}>■ 已掌握</span>
        <span style={{ color: '#fa8c16', marginLeft: '1rem' }}>■ 需复习</span>
        <span style={{ color: '#5B8FF9', marginLeft: '1rem' }}>■ 普通</span>
      </p>

      <div style={{ background: 'white', borderRadius: '10px', padding: '1rem' }}>
        <ReactECharts
          option={option}
          style={{ height: '600px', width: '100%' }}
          onEvents={{ click: onChartClick }}
        />
      </div>

      <p style={{ marginTop: '1rem', color: '#999', fontSize: '0.9rem' }}>
        提示：可以拖拽画布、缩放视图、拖拽节点调整布局。鼠标悬停查看详情，点击节点可跳转到编辑页。
      </p>
    </div>
  );
}

export default GraphPage;