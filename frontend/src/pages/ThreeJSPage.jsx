// src/pages/ThreeJSPage.jsx
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import apiClient from '../api/axios';

function ThreeJSPage() {
  const mountRef = useRef(null);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. 获取数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get('/graph/knowledge-map');
        setGraphData(response.data);
      } catch (err) {
        console.error('获取图谱数据失败', err);
        setError('获取知识图谱数据失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. 构建 3D 场景
  useEffect(() => {
    if (loading || !graphData.nodes || graphData.nodes.length === 0) {
      if (!loading) setError('你还没有知识点，先去创建一些吧！');
      return;
    }

    const currentMount = mountRef.current;
    if (!currentMount) return;

    // --- 场景 ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e1a);

    // --- 相机 ---
    const camera = new THREE.PerspectiveCamera(
      75,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 15);
    camera.lookAt(0, 0, 0);

    // --- 渲染器 ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);

    // --- 轨道控制器 ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 5;
    controls.maxDistance = 50;

    // --- 光照 ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 2);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // --- 创建节点 ---
    const nodeObjects = new Map();
    const spheres = []; 
    const sphereGeometry = new THREE.SphereGeometry(0.8, 32, 32);

    graphData.nodes.forEach((node, index) => {
      let color = 0x5b8ff9; 
      if (node.status === 'mastered') color = 0x52c41a; 
      else if (node.reviewList) color = 0xfa8c16;

      const material = new THREE.MeshBasicMaterial({ color });
      const sphere = new THREE.Mesh(sphereGeometry, material);

      const angle = (index / graphData.nodes.length) * Math.PI * 2;
      sphere.position.set(Math.cos(angle) * 5, Math.sin(angle) * 5, 0);

      sphere.userData = { 
        id: node.id, 
        baseY: sphere.position.y,
        originalColor: color 
      };
      
      scene.add(sphere);
      nodeObjects.set(node.id, sphere);
      spheres.push(sphere); 
    });

    // --- 创建航线（重点改造） ---
    // 用一个数组把所有航线存起来，并记录它连接了哪两个节点
    const lines = [];
    
    graphData.links.forEach((link) => {
      const sourceNode = nodeObjects.get(link.source);
      const targetNode = nodeObjects.get(link.target);
      
      if (sourceNode && targetNode) {
        const points = [sourceNode.position, targetNode.position];
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // 默认材质的航线
        const lineMaterial = new THREE.LineBasicMaterial({
          color: 0x88aaff,
          transparent: true,
          opacity: 0.3, // 默认透明度调低一点，高亮时对比才明显
        });
        
        const line = new THREE.Line(lineGeometry, lineMaterial);
        
        // 关键：把连接的两个节点ID存进线的属性里
        line.userData = { sourceId: link.source, targetId: link.target };
        
        scene.add(line);
        lines.push(line);
      }
    });

    // ==========================================
    // 🌟 鼠标交互 (Raycaster)
    // ==========================================
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-10, -10);
    let hoveredSphere = null; 

    const onMouseMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    renderer.domElement.addEventListener('mousemove', onMouseMove);

    // --- 动画循环 ---
    let animationId;
    let time = 0;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      time += 0.01;

      // 1. 星球浮动
      spheres.forEach((sphere) => {
        sphere.position.y = sphere.userData.baseY + Math.sin(time * 2) * 0.3;
      });

      // 2. 射线检测
      if (spheres.length > 0) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(spheres);

        if (intersects.length > 0) {
          const currentHovered = intersects[0].object;
          
          if (hoveredSphere !== currentHovered) {
            // --- 第一步：恢复上一次的星球和航线 ---
            if (hoveredSphere) {
              hoveredSphere.scale.set(1, 1, 1);
              hoveredSphere.material.color.setHex(hoveredSphere.userData.originalColor);
              
              // 恢复所有航线
              lines.forEach(line => {
                line.material.color.setHex(0x88aaff);
                line.material.opacity = 0.3;
              });
            }

            // --- 第二步：高亮新悬停的星球和它的航线 ---
            currentHovered.scale.set(1.6, 1.6, 1.6); // 放大
            currentHovered.material.color.setHex(0xffffff); // 变白
            
            // 遍历所有航线，凡是连在这个星球上的，全部高亮变粗
            lines.forEach(line => {
              if (
                line.userData.sourceId === currentHovered.userData.id ||
                line.userData.targetId === currentHovered.userData.id
              ) {
                line.material.color.setHex(0x00ffff); // 变成亮青色
                line.material.opacity = 1.0;          // 不透明
              }
            });
            
            hoveredSphere = currentHovered;
            renderer.domElement.style.cursor = 'pointer'; 
          }
        } else {
          // --- 第三步：鼠标离开所有星球，全部恢复原样 ---
          if (hoveredSphere) {
            hoveredSphere.scale.set(1, 1, 1);
            hoveredSphere.material.color.setHex(hoveredSphere.userData.originalColor);
            
            lines.forEach(line => {
              line.material.color.setHex(0x88aaff);
              line.material.opacity = 0.3;
            });

            hoveredSphere = null;
            renderer.domElement.style.cursor = 'default';
          }
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // --- 窗口自适应 ---
    const handleResize = () => {
      if (!currentMount) return;
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- 清理 ---
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', onMouseMove); 
      if (currentMount && renderer.domElement.parentNode === currentMount) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [graphData, loading]);

  if (loading) return <p>正在加载知识宇宙数据...</p>;
  if (error) return <p className="error-msg">{error}</p>;

  return (
    <div>
      <h1 className="page-title">🌌 3D 知识宇宙</h1>
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        每个星球代表一个知识点；每条航线代表一次引用。
        星球颜色：<span style={{ color: '#52c41a' }}>■ 已掌握</span>
        <span style={{ color: '#fa8c16', marginLeft: '1rem' }}>■ 需复习</span>
        <span style={{ color: '#5b8ff9', marginLeft: '1rem' }}>■ 普通</span>
      </p>

      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: '80vh',
          background: '#0a0e1a',
          borderRadius: '10px',
          overflow: 'hidden',
        }}
      />

      <p style={{ marginTop: '1rem', color: '#999', fontSize: '0.9rem' }}>
        提示：鼠标左键拖拽旋转，滚轮缩放，右键拖拽平移。悬停星球可点亮它的星际航线。
      </p>
    </div>
  );
}

export default ThreeJSPage;