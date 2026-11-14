import { createContext, useContext } from 'react';
import { PLUGINS } from '../../plugins';
import type { AgentInfo, AgentUIPlugin, MenuItem, MenuSection } from '../../plugins/types';

/** The admin's agents: "All agents" (the core: chat assistant, channels, account) plus one per plugin. Each has its
 * own left menu; the Agent dropdown switches between them. */
export const ALL = 'all';

export interface Agent extends AgentInfo {
  plugin?: AgentUIPlugin;
  menu: MenuSection[];
}

/** Core pages any agent's menu can link to; they show that agent's part when one is picked (?agent=…). */
export const SHARED = ['logs', 'usage', 'plugins', 'settings', 'keys', 'knowledge', 'agent', 'avatar', 'model', 'phone', 'calendar'];

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function agentOf(p: AgentUIPlugin): AgentInfo {
  return p.agent ?? { id: p.id, name: titleCase(p.id) };
}

const TAIL: MenuSection[] = [
  { title: 'Activity', items: [{ to: 'logs', label: 'Agent logs', icon: 'logs' }] },
  { title: 'Account', items: [
    { to: 'usage', label: 'Usage & costs', icon: 'billing' },
    { to: 'plugins', label: 'Plugins', icon: 'plugin' },
    { to: 'keys', label: 'Settings & keys', icon: 'key' },
    { to: 'settings', label: 'Settings', icon: 'settings' },
  ] },
];

/** The plugin's own menu (or a default one), then the shared pages it doesn't already list. */
export function pluginMenu(p: AgentUIPlugin): MenuSection[] {
  const info = agentOf(p);
  const own: MenuSection[] = p.menu ?? [
    { items: [{ to: '', label: 'Dashboard', icon: 'home' }] },
    { title: info.name, items: (p.adminPages ?? []).map((pg) => ({ to: pg.path, label: pg.label, icon: pg.icon,
                                                                   description: pg.description })) },
  ];
  const listed = new Set(own.flatMap((s) => s.items.map((i) => i.to)));
  const tail = TAIL.map((s) => ({ ...s, items: s.items.filter((i) => !listed.has(i.to)) }))
    .filter((s) => s.items.length);
  return [...own, ...tail];
}

export function coreMenu(agents: Agent[]): MenuSection[] {
  const sections: MenuSection[] = [
    { items: [{ to: '', label: 'Dashboard', icon: 'home' }] },
    { title: 'Assistant', items: [
      { to: 'agent', label: 'Agent', icon: 'agent', description: 'Its name, greeting, quick replies and business answers; try it as visitors see it.' },
      { to: 'avatar', label: 'Avatar', icon: 'avatar', description: 'The face and voice visitors see and hear.' },
      { to: 'knowledge', label: 'Knowledge', icon: 'knowledge', description: 'Documents and pages your agents use to answer questions.' },
      { to: 'model', label: 'Model & tools', icon: 'model', description: 'The model behind your agents and the tools they can use.' },
    ] },
    { title: 'Channels', items: [
      { to: 'phone', label: 'Phone', icon: 'phone', description: 'The number your AI answers and its call script.' },
      { to: 'calendar', label: 'Calendar', icon: 'calendar', description: 'Booking slots and calendar connection.' },
    ] },
  ];
  if (agents.length) {
    sections.push({ title: 'Agents', items: agents.map((a) => ({
      to: `@${a.id}`, label: a.name, icon: 'bot',
      description: a.description })) });
  }
  return [...sections, ...TAIL];
}

export function buildAgents(plugins: AgentUIPlugin[] = PLUGINS): { all: Agent; agents: Agent[] } {
  const agents: Agent[] = plugins.map((p) => ({ ...agentOf(p), plugin: p, menu: pluginMenu(p) }));
  return { all: { id: ALL, name: 'All agents', menu: coreMenu(agents) }, agents };
}

/** Which agent a page belongs to: ?agent=… wins, then the plugin that owns the page, else All agents. */
export function agentFor(pathname: string, search: string, agents: Agent[]): string {
  const asked = new URLSearchParams(search).get('agent');
  if (asked && agents.some((a) => a.id === asked)) return asked;
  const page = pathname.replace(/^\/admin\/?/, '').split('/')[0];
  const owner = agents.find((a) => a.plugin?.adminPages?.some((pg) => pg.path === page));
  return owner ? owner.id : ALL;
}

/** Where a menu item goes for the picked agent. */
export function hrefFor(item: MenuItem, agentId: string): string {
  if (item.to.startsWith('@')) return `/admin?agent=${item.to.slice(1)}`;
  const q = agentId === ALL ? '' : `?agent=${agentId}`;
  if (item.to === '') return `/admin${q}`;
  return `/admin/${item.to}${SHARED.includes(item.to) ? q : ''}`;
}

/** Where the dropdown goes: the same shared page for the new agent, or that agent's dashboard. */
export function switchTo(pathname: string, newId: string): string {
  const page = pathname.replace(/^\/admin\/?/, '').split('/')[0];
  const q = newId === ALL ? '' : `?agent=${newId}`;
  return SHARED.includes(page) ? `/admin/${page}${q}` : `/admin${q}`;
}

export const AgentContext = createContext<{ agent: Agent; agents: Agent[] }>({
  agent: { id: ALL, name: 'All agents', menu: [] }, agents: [],
});

/** The agent picked in the dropdown, for pages that show one agent's part (Agent logs, Usage & costs, …). */
export function useAgent() {
  return useContext(AgentContext);
}
