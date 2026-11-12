// Example UI plugins used by the e2e tests (AGENT_UI_PLUGINS points here when testing).
import { PageHeader, type AgentUIPlugin } from '@agent-ui/core';
import { useState } from 'react';

function DemoPage() {
  const [n, setN] = useState(0);
  return (
    <>
      <PageHeader title="Demo plugin" subtitle="A page added by a plugin." />
      <button type="button" className="btn" onClick={() => setN(n + 1)}>Clicked {n}</button>
    </>
  );
}

const plugins: AgentUIPlugin[] = [
  // API 2: an agent with its own menu and a badge
  { id: 'demo', apiVersions: [1, 2], agent: { id: 'demo', name: 'Demo agent', description: 'An agent added by a plugin.' },
    adminPages: [{ path: 'demo', label: 'Demo', icon: 'idea', element: <DemoPage /> }],
    menu: [
      { items: [{ to: '', label: 'Dashboard', icon: 'home' }] },
      { title: 'Demo', items: [
        { to: 'demo', label: 'Demo', icon: 'idea', description: 'The demo page.', badge: async () => 3 },
        { to: 'knowledge', label: 'Knowledge', icon: 'knowledge' },
      ] },
    ] },
  // API 1: pages only, gets a default menu
  { id: 'legacy', apiVersions: [1], adminPages: [{ path: 'legacy', label: 'Legacy page', icon: '🧩', element: <p>Old style</p> }] },
  { id: 'future', apiVersions: [99], adminPages: [{ path: 'future', label: 'Future', icon: '🚀', element: <p>never</p> }] },
];
export default plugins;
