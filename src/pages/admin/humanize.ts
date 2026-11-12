/** Plain words for internal names (tool names, log actions). No imports: safe for the plugin SDK. */
const ACRONYMS: Record<string, string> = { jira: 'Jira', github: 'GitHub', kpi: 'KPI', kpis: 'KPIs', repo: 'repository',
  repos: 'repositories', pr: 'pull request', prs: 'pull requests', mcp: 'MCP', id: 'ID', url: 'URL', api: 'API' };

/** "read_repo_file" → "Read repository file". */
export function humanize(name: string): string {
  const words = name.split(/[_.\s-]+/).filter(Boolean).map((w) => ACRONYMS[w.toLowerCase()] ?? w.toLowerCase());
  const s = words.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

