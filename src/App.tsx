import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ChatPage } from './pages/ChatPage';
import { LoginPage } from './pages/LoginPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AgentLogs } from './pages/admin/AgentLogs';
import { AgentPage } from './pages/admin/AgentPage';
import { AvatarSettings } from './pages/admin/AvatarSettings';
import { PLUGIN_ADMIN_PAGES } from './plugins';
import { Calendar } from './pages/admin/Calendar';
import { Dashboard } from './pages/admin/Dashboard';
import { Hermes } from './pages/admin/Hermes';
import { KeysPage } from './pages/admin/KeysPage';
import { Knowledge } from './pages/admin/Knowledge';
import { Phone } from './pages/admin/Phone';
import { PluginsPage } from './pages/admin/PluginsPage';
import { Settings } from './pages/admin/Settings';
import { UsagePage } from './pages/admin/UsagePage';

/** Old addresses keep working: Builder → Agent, Hermes → Model & tools, Audit → Agent logs. */
function Moved({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`/admin/${to}${search}`} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<ChatPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="agent" element={<AgentPage />} />
        <Route path="avatar" element={<AvatarSettings />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="model" element={<Hermes />} />
        <Route path="phone" element={<Phone />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="logs" element={<AgentLogs />} />
        <Route path="usage" element={<UsagePage />} />
        <Route path="plugins" element={<PluginsPage />} />
        <Route path="settings" element={<Settings />} />
        <Route path="keys" element={<KeysPage />} />
        <Route path="builder" element={<Moved to="agent" />} />
        <Route path="hermes" element={<Moved to="model" />} />
        <Route path="audit" element={<Moved to="logs" />} />
        {PLUGIN_ADMIN_PAGES.map((pg) => <Route key={pg.path} path={pg.path} element={pg.element} />)}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
