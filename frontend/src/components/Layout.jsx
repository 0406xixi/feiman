// src/components/Layout.jsx
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function Layout() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <nav className="app-nav">
        <Link to="/">📚 费曼学习平台</Link>
        <Link to="/">主页</Link>
        <Link to="/agent">🤖 AI 助手</Link>
        <Link to="/graph">🕸 知识图谱</Link>
        <Link to="/3d-world">🌌 3D 视界</Link>
        {token ? (
          <button onClick={handleLogout}>退出登录</button>
        ) : (
          <>
            <Link to="/login">登录</Link>
            <Link to="/register">注册</Link>
          </>
        )}
      </nav>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;