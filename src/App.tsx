import { Navigate, Route, Routes } from 'react-router-dom';
import { ChatPage } from './pages/ChatPage';
import { LoginPage } from './pages/LoginPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AvatarSettings } from './pages/admin/AvatarSettings';
import { Builder } from './pages/admin/Builder';
import { Audit } from './pages/admin/Audit';
import { PLUGIN_ADMIN_PAGES } from './plugins';
import { Calendar } from './pages/admin/Calendar';
import { Dashboard } from './pages/admin/Dashboard';
import { Hermes } from './pages/admin/Hermes';
import { Knowledge } from './pages/admin/Knowledge';
import { Phone } from './pages/admin/Phone';
import { Settings } from './pages/admin/Settings';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<ChatPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="builder" element={<Builder />} />
        <Route path="avatar" element={<AvatarSettings />} />
        <Route path="phone" element={<Phone />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="hermes" element={<Hermes />} />
        <Route path="audit" element={<Audit />} />
        <Route path="settings" element={<Settings />} />
        {PLUGIN_ADMIN_PAGES.map((pg) => <Route key={pg.path} path={pg.path} element={pg.element} />)}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
