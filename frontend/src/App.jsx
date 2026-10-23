// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import KnowledgePointFormPage from './pages/KnowledgePointFormPage';
import FeynmanRecordPage from './pages/FeynmanRecordPage';
import ProtectedRoute from './components/ProtectedRoute';
import QuizPage from './pages/QuizPage';
import AgentPage from './pages/AgentPage';
import GraphPage from './pages/GraphPage';
import ThreeJSPage from './pages/ThreeJSPage';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/kp/new" element={<KnowledgePointFormPage />} />
          <Route path="/kp/edit/:id" element={<KnowledgePointFormPage />} />
          <Route path="/feynman/:id" element={<FeynmanRecordPage />} />
          <Route path="/quiz/:id" element={<QuizPage />} />
          <Route path="/agent" element={<AgentPage />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/3d-world" element={<ThreeJSPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;