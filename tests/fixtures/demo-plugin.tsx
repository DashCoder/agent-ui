// Example UI plugin used by the e2e tests (AGENT_UI_PLUGINS points here when testing).
import { PageHeader, UI_PLUGIN_API, type AgentUIPlugin } from '@agent-ui/core';
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
  { id: 'demo', apiVersions: [UI_PLUGIN_API], adminPages: [{ path: 'demo', label: 'Demo', icon: '🧩', element: <DemoPage />, after: 'builder' }] },
  { id: 'future', apiVersions: [99], adminPages: [{ path: 'future', label: 'Future', icon: '🚀', element: <p>never</p> }] },
];
export default plugins;
