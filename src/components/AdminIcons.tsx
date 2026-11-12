import type { ReactNode } from 'react';
import type { AdminIconName } from '../plugins/types';

/** Line icons in the admin-centre style (1.5 stroke, currentColor), 20px by default. A name that isn't an icon
 * (an emoji from a version 1 plugin) is shown as text. */
export function AdminIcon({ name, size = 20 }: { name: AdminIconName | string; size?: number }) {
  const path = PATHS[name as AdminIconName];
  if (!path) return <span aria-hidden style={{ width: size, textAlign: 'center', fontSize: size * 0.85, lineHeight: 1 }}>{name}</span>;
  return <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" style={{ flexShrink: 0 }}>{path}</svg>;
}

const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const PATHS: Record<AdminIconName, ReactNode> = {
  home: <><path {...p} d="M3.5 9.5 10 4l6.5 5.5" /><path {...p} d="M5 8.5V16h3.5v-4.5h3V16H15V8.5" /></>,
  agent: <><path {...p} d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v6a1.5 1.5 0 0 1-1.5 1.5H9l-3.5 3v-3h0A1.5 1.5 0 0 1 4 11.5z" /><path {...p} d="M7.5 8.5h.01M10 8.5h.01M12.5 8.5h.01" strokeWidth={2} /></>,
  avatar: <><circle {...p} cx="10" cy="7" r="3" /><path {...p} d="M4.5 16c.8-2.8 3-4.2 5.5-4.2s4.7 1.4 5.5 4.2" /></>,
  phone: <path {...p} d="M6.2 3.5h-1.4A1.3 1.3 0 0 0 3.5 4.9C3.8 11 9 16.2 15.1 16.5a1.3 1.3 0 0 0 1.4-1.3v-1.4a1 1 0 0 0-.7-1l-2.3-.8a1 1 0 0 0-1.1.3l-.8 1a9 9 0 0 1-4.4-4.4l1-.8a1 1 0 0 0 .3-1.1l-.8-2.3a1 1 0 0 0-1-.7z" />,
  calendar: <><rect {...p} x="3.5" y="4.5" width="13" height="12" rx="1.5" /><path {...p} d="M3.5 8h13M7 3v3M13 3v3" /></>,
  knowledge: <><path {...p} d="M4 4.5h4.5A1.5 1.5 0 0 1 10 6v10a1.5 1.5 0 0 0-1.5-1.5H4z" /><path {...p} d="M16 4.5h-4.5A1.5 1.5 0 0 0 10 6v10a1.5 1.5 0 0 1 1.5-1.5H16z" /></>,
  settings: <><circle {...p} cx="10" cy="10" r="2.5" /><path {...p} d="M10 3v1.6M10 15.4V17M3 10h1.6M15.4 10H17M5.05 5.05l1.13 1.13M13.82 13.82l1.13 1.13M5.05 14.95l1.13-1.13M13.82 6.18l1.13-1.13" /></>,
  docs: <><path {...p} d="M6 3.5h5.5L15 7v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" /><path {...p} d="M11 3.5V7.5h4M7.5 11h5M7.5 13.5h5" /></>,
  logs: <><path {...p} d="M7 5.5h9M7 10h9M7 14.5h9" /><path {...p} d="M3.75 5.5h.01M3.75 10h.01M3.75 14.5h.01" strokeWidth={2} /></>,
  billing: <><rect {...p} x="3" y="5" width="14" height="10" rx="1.5" /><path {...p} d="M3 8.5h14M6 12h3" /></>,
  code: <path {...p} d="M7 6.5 3.5 10 7 13.5M13 6.5l3.5 3.5-3.5 3.5M11.2 4.5l-2.4 11" />,
  model: <><rect {...p} x="5" y="5" width="10" height="10" rx="1.5" /><path {...p} d="M8 2.5V5M12 2.5V5M8 15v2.5M12 15v2.5M2.5 8H5M2.5 12H5M15 8h2.5M15 12h2.5" /><rect {...p} x="8" y="8" width="4" height="4" rx=".5" /></>,
  plugin: <><path {...p} d="M8 3.5v3M12 3.5v3" /><path {...p} d="M5.5 6.5h9v3a4.5 4.5 0 0 1-9 0z" /><path {...p} d="M10 14v3" /></>,
  slack: <><path {...p} d="M7.5 3.5v7M12.5 9.5v7M3.5 12.5h7M9.5 7.5h7" /></>,
  pr: <><circle {...p} cx="6" cy="5" r="1.75" /><circle {...p} cx="6" cy="15" r="1.75" /><circle {...p} cx="14" cy="15" r="1.75" /><path {...p} d="M6 6.75v6.5M14 13.25V9a3 3 0 0 0-3-3H8.5" /><path {...p} d="m10 4.5-1.5 1.5L10 7.5" /></>,
  idea: <><path {...p} d="M7.5 13.5c0-1.6-2.5-2.7-2.5-5.5a5 5 0 0 1 10 0c0 2.8-2.5 3.9-2.5 5.5z" /><path {...p} d="M8 16h4M8.5 13.5h3" /></>,
  content: <><rect {...p} x="3.5" y="4.5" width="13" height="11" rx="1.5" /><path {...p} d="m8.5 7.8 3.5 2.2-3.5 2.2z" /></>,
  notes: <><path {...p} d="M5.5 3.5h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1z" /><path {...p} d="M7.5 7h5M7.5 10h5M7.5 13h3" /></>,
  chart: <><path {...p} d="M3.5 16.5h13" /><path {...p} d="M6 13.5V10M10 13.5V6M14 13.5V8.5" /></>,
  review: <><path {...p} d="M3.5 6h13v8.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1z" /><path {...p} d="M3.5 6 5 3.5h10L16.5 6M7.5 10l1.8 1.8L12.5 8.5" /></>,
  key: <><circle {...p} cx="7" cy="12" r="3.25" /><path {...p} d="m9.4 9.6 6.1-6.1M13.5 5.5l1.75 1.75M11.75 7.25l1.25 1.25" /></>,
  mail: <><rect {...p} x="3" y="5" width="14" height="10" rx="1.5" /><path {...p} d="m3.5 6 6.5 5 6.5-5" /></>,
  target: <><circle {...p} cx="10" cy="10" r="6.5" /><circle {...p} cx="10" cy="10" r="3.5" /><circle {...p} cx="10" cy="10" r=".6" strokeWidth={2} /></>,
  shield: <><path {...p} d="M10 3 4.5 5v4.5c0 3.4 2.3 6 5.5 7.5 3.2-1.5 5.5-4.1 5.5-7.5V5z" /></>,
  repo: <><path {...p} d="M5.5 3.5h9.5v11h-9.5a1.5 1.5 0 0 0 0 3H15" /><path {...p} d="M5.5 3.5A1.5 1.5 0 0 0 4 5v11" /></>,
  video: <><rect {...p} x="3" y="5.5" width="10" height="9" rx="1.5" /><path {...p} d="m13 8.5 4-2v7l-4-2" /></>,
  bot: <><rect {...p} x="4" y="7" width="12" height="9" rx="2" /><path {...p} d="M10 4v3M7.5 11h.01M12.5 11h.01" strokeWidth={1.75} /><path {...p} d="M8 14h4" /></>,
};
