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

    // 1. 场景设置（使用很深的蓝色，更有宇宙感）
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e1a);

    // 2. 相机设置
    const camera = new THREE.PerspectiveCamera(
      60, // 视野调小一点，让物体显得更大
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      3000 // 远裁切面调大，确保能看到远处的星星
    );
    camera.position.set(0, 0, 60); // 相机稍微拉近

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    currentMount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // 3. 加强光照（因为用了标准材质，没有光就是黑的）
    scene.add(new THREE.AmbientLight(0xffffff, 1.5)); // 环境光拉满
    const pointLight = new THREE.PointLight(0xffffff, 3);
    pointLight.position.set(20, 20, 20);
    scene.add(pointLight);
    const pointLight2 = new THREE.PointLight(0x4a90e2, 2);
    pointLight2.position.set(-20, -20, -20);
    scene.add(pointLight2);

    // ==========================================
    // 🌟 小彩蛋 1：漫天繁星背景
    // ==========================================
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 2000;
    const starsPositions = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i += 3) {
      // 星星随机分布在 100 到 500 的距离，确保在相机视野内
      const r = 100 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      starsPositions[i] = r * Math.sin(phi) * Math.cos(theta);
      starsPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starsPositions[i + 2] = r * Math.cos(phi);
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8, // 星星大小
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true 
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // ==========================================
    // 🌌 力导向图初始化
    // ==========================================
    const simulationNodes = graphData.nodes.map(n => ({ ...n }));
    const simulationLinks = graphData.links.map(l => ({ ...l }));

    // 给节点设置初始位置（防止它们一开始全在原点重叠）
    simulationNodes.forEach(node => {
      node.x = (Math.random() - 0.5) * 20;
      node.y = (Math.random() - 0.5) * 20;
      node.z = (Math.random() - 0.5) * 20;
    });

    const simulation = d3.forceSimulation(simulationNodes, 3)
      .force('charge', d3.forceManyBody().strength(-50))
      .force('link', d3.forceLink(simulationLinks).id(d => d.id).distance(15)) // 缩短连线距离
      .force('center', d3.forceCenter(0, 0, 0));

    // --- 渲染星球节点 ---
    const sphereGeometry = new THREE.SphereGeometry(2.5, 32, 32); // 星球变大
    const sphereMeshes = [];
    const nodeMap = new Map();

    simulationNodes.forEach(node => {
      let color = 0x5b8ff9; // 默认蓝
      if (node.status === 'mastered') color = 0x52c41a; // 已掌握绿
      else if (node.reviewList) color = 0xfa8c16; // 需复习橙

      const material = new THREE.MeshStandardMaterial({ 
        color: color,
        emissive: color,
        emissiveIntensity: 0.6, // 自带发光，即使没光照也能看见
        roughness: 0.4,
      });
      
      const sphere = new THREE.Mesh(sphereGeometry, material);
      sphere.userData = { id: node.id, title: node.name, status: node.status, originalColor: color };
      
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
        
        // 恢复所有状态
        sphereMeshes.forEach(s => {
          s.scale.set(1, 1, 1);
          s.material.emissiveIntensity = 0.6; 
        });
        lineMeshes.forEach(l => { l.material.color.setHex(0x88aaff); l.material.opacity = 0.4; });

        // 高亮选中的星球（放大且极大增强发光）
        clicked.scale.set(1.6, 1.6, 1.6);
        clicked.material.emissiveIntensity = 2.0; 

        // 高亮连接线
        lineMeshes.forEach(line => {
          if (line.userData.sourceId === clicked.userData.id || line.userData.targetId === clicked.userData.id) {
            line.material.color.setHex(0x00ffff);
            line.material.opacity = 1.0;
          }
        });

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
        // 点击空白
        sphereMeshes.forEach(s => {
          s.scale.set(1, 1, 1);
          s.material.emissiveIntensity = 0.6;
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
        if (mesh) {
          mesh.position.set(node.x, node.y, node.z);
          // 🌟 星球自转
          mesh.rotation.y += 0.01;
        }
      });

      simulationLinks.forEach((link, index) => {
        const sourceNode = nodeMap.get(link.source.id || link.source);
        const targetNode = nodeMap.get(link.target.id || link.target);
        if (sourceNode && targetNode) {
          const points = [sourceNode.position, targetNode.position];
          lineMeshes[index].geometry.setFromPoints(points);
        }
      });

      // 星空缓慢旋转
      stars.rotation.y -= 0.0005;

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
      <p style={{ color: '#666' }}>星球会自动聚集并自转。点击星球查看详细内容与高亮航线。</p>
      
      <div ref={mountRef} style={{ width: '100%', height: '100%', borderRadius: '10px', overflow: 'hidden' }} />

      {selectedNodeData && (
        <div style={{
          position: 'absolute', bottom: '20px', right: '20px',
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)',
          color: 'white', padding: '20px', borderRadius: '12px',
          border: '1px solid rgba(74, 144, 226, 0.5)', width: '320px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.1)',
          transition: 'all 0.3s ease'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#4a90e2', fontSize: '1.2rem', textShadow: '0 0 10px rgba(74,144,226,0.5)' }}>
            🌟 {selectedNodeData.title}
          </h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
            <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '10px' }}>
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
            background: 'rgba(74, 144, 226, 0.8)', color: 'white', border: 'none',
            borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s'
          }} onMouseOver={(e) => e.target.style.background = '#4a90e2'} onMouseOut={(e) => e.target.style.background = 'rgba(74, 144, 226, 0.8)'}>
            关闭详情
          </button>
        </div>
      )}
    </div>
  );
}

export default KnowledgeUniversePage;