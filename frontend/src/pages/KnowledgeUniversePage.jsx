// src/pages/KnowledgeUniversePage.jsx
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as d3 from 'd3-force-3d';
import apiClient from '../api/axios';

function KnowledgeUniversePage() {
  const mountRef = useRef(null);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNodeData, setSelectedNodeData] = useState(null); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get('/graph/knowledge-map');
        setGraphData(response.data);
      } catch (err) {
        console.error('获取图谱数据失败', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (loading || !graphData.nodes || graphData.nodes.length === 0) return;
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // --- Three.js 基础 ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e1a);
    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 100); 
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    currentMount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // 光照（改用标准材质后，必须有光照才能看见球）
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const pointLight = new THREE.PointLight(0xffffff, 2);
    pointLight.position.set(50, 50, 50);
    scene.add(pointLight);

    // --- d3-force-3d 初始化 ---
    const simulationNodes = graphData.nodes.map(n => ({ ...n }));
    const simulationLinks = graphData.links.map(l => ({ ...l }));

    const simulation = d3.forceSimulation(simulationNodes, 3)
      .force('charge', d3.forceManyBody().strength(-50))
      .force('link', d3.forceLink(simulationLinks).id(d => d.id).distance(25))
      .force('center', d3.forceCenter(0, 0, 0));

    // --- 渲染节点 ---
    const sphereGeometry = new THREE.SphereGeometry(2, 32, 32);
    const sphereMeshes = [];
    const nodeMap = new Map();

    simulationNodes.forEach(node => {
      let color = 0x5b8ff9;
      if (node.status === 'mastered') color = 0x52c41a;
      else if (node.reviewList) color = 0xfa8c16;

      // 👇 换成 StandardMaterial，支持发光
      const material = new THREE.MeshStandardMaterial({ 
        color: color,
        emissive: color,
        emissiveIntensity: 0.2, // 默认微光
        roughness: 0.4,
        metalness: 0.1
      });
      const sphere = new THREE.Mesh(sphereGeometry, material);
      
      sphere.userData = { 
        id: node.id, 
        title: node.name, 
        status: node.status, 
        originalColor: color 
      };
      
      scene.add(sphere);
      sphereMeshes.push(sphere);
      nodeMap.set(node.id, sphere);
    });

    // --- 渲染连线 ---
    const lineMeshes = [];
    simulationLinks.forEach(link => {
      const lineGeometry = new THREE.BufferGeometry();
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.4 });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.userData = { sourceId: link.source.id || link.source, targetId: link.target.id || link.target };
      scene.add(line);
      lineMeshes.push(line);
    });

    // --- 鼠标交互 ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    const onClick = async (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(sphereMeshes);

      if (intersects.length > 0) {
        const clicked = intersects[0].object;
        
        // 1. 恢复所有星球的状态（缩小、发光变暗）
        sphereMeshes.forEach(s => {
          s.scale.set(1, 1, 1);
          s.material.emissiveIntensity = 0.2; 
        });
        
        // 恢复所有连线
        lineMeshes.forEach(l => { 
          l.material.color.setHex(0x88aaff); 
          l.material.opacity = 0.4; 
        });

        // 2. 高亮选中的星球（放大、强发光、保持原色）
        clicked.scale.set(1.5, 1.5, 1.5);
        clicked.material.emissiveIntensity = 1.0; // 👈 发强光，但不改变 color

        // 3. 高亮与它相连的航线
        lineMeshes.forEach(line => {
          if (line.userData.sourceId === clicked.userData.id || line.userData.targetId === clicked.userData.id) {
            line.material.color.setHex(0x00ffff);
            line.material.opacity = 1.0;
          }
        });

        // 4. 拉取详情
        try {
          const kpDetail = await apiClient.get(`/knowledge-points/${clicked.userData.id}`);
          setSelectedNodeData({
            title: kpDetail.data.title,
            content: kpDetail.data.content,
            status: kpDetail.data.status,
            reviewList: kpDetail.data.reviewList
          });
        } catch (err) {
          console.error("获取详情失败", err);
        }
      } else {
        // 点击空白处：全部恢复默认
        sphereMeshes.forEach(s => {
          s.scale.set(1, 1, 1);
          s.material.emissiveIntensity = 0.2;
        });
        lineMeshes.forEach(l => { l.material.color.setHex(0x88aaff); l.material.opacity = 0.4; });
        setSelectedNodeData(null);
      }
    };
    renderer.domElement.addEventListener('click', onClick);

    // --- 动画循环 ---
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      simulation.tick();

      simulationNodes.forEach(node => {
        const mesh = nodeMap.get(node.id);
        if (mesh) mesh.position.set(node.x, node.y, node.z);
      });

      simulationLinks.forEach((link, index) => {
        const sourceNode = nodeMap.get(link.source.id || link.source);
        const targetNode = nodeMap.get(link.target.id || link.target);
        if (sourceNode && targetNode) {
          const points = [sourceNode.position, targetNode.position];
          lineMeshes[index].geometry.setFromPoints(points);
        }
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      simulation.stop();
      renderer.domElement.removeEventListener('click', onClick);
      if (currentMount && renderer.domElement.parentNode === currentMount) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [graphData, loading]);

  if (loading) return <p>正在加载星系数据...</p>;

  return (
    <div style={{ position: 'relative', width: '100%', height: '80vh' }}>
      <h1 className="page-title">🌌 终极力导向知识星系</h1>
      <p style={{ color: '#666' }}>星球会自动根据引用关系聚集。点击星球查看详细内容与高亮航线。</p>
      
      <div ref={mountRef} style={{ width: '100%', height: '100%', background: '#0a0e1a', borderRadius: '10px' }} />

      {selectedNodeData && (
        <div style={{
          position: 'absolute', bottom: '20px', right: '20px',
          background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)',
          color: 'white', padding: '20px', borderRadius: '12px',
          border: '1px solid #4a90e2', width: '320px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          transition: 'all 0.3s ease'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#4a90e2', fontSize: '1.2rem' }}>
            🌟 {selectedNodeData.title}
          </h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
            <span style={{ fontSize: '0.8rem', background: '#333', padding: '2px 8px', borderRadius: '10px' }}>
              状态: {selectedNodeData.status}
            </span>
            {selectedNodeData.reviewList && selectedNodeData.status !== 'mastered' && (
              <span style={{ fontSize: '0.8rem', background: '#fa8c16', padding: '2px 8px', borderRadius: '10px', color: 'white' }}>
                ⚠️ 需复习
              </span>
            )}
          </div>
          <div style={{ 
            maxHeight: '150px', overflowY: 'auto', fontSize: '0.9rem', 
            color: '#ccc', lineHeight: '1.6', paddingRight: '5px' 
          }}>
            {selectedNodeData.content}
          </div>
          <button onClick={() => setSelectedNodeData(null)} style={{
            marginTop: '15px', width: '100%', padding: '8px',
            background: '#4a90e2', color: 'white', border: 'none',
            borderRadius: '6px', cursor: 'pointer'
          }}>关闭详情</button>
        </div>
      )}
    </div>
  );
}

export default KnowledgeUniversePage;