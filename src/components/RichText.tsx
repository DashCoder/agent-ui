import type { TicketLinks } from '../api/types';
import { useSiteConfig } from '../hooks/useSiteConfig';
import type { ReactNode } from 'react';

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;
const FILE_EXT = /\.(pdf|zip|csv|txt|md|json|docx?|xlsx?|pptx?|mp3|wav|mp4|mov|html?)$/i;

/** Absolute file paths the agent mentions (e.g. /Users/aiagents/.hermes/cache/generated/images/x.png). */
const LOCAL_PATH = /(?:~|\/Users|\/home|\/workspace)\/[^\s`'"<>()]+\.[A-Za-z0-9]{2,5}/;
const URL_RE = /https?:\/\/[^\s<>()`"']+[^\s<>()`"'.,;:!?]/;
const MD_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/;
const INLINE = new RegExp(`(${MD_LINK.source})|(\`[^\`]+\`)|(\\*\\*[^*]+\\*\\*)|(${URL_RE.source})|(${LOCAL_PATH.source})`, 'g');

export const fileUrl = (path: string, download = false) =>
  `/api/files?path=${encodeURIComponent(path)}${download ? '&download=true' : ''}`;

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'link';
  }
}

/** A short, friendly label; the full address shows on hover. */
function SmartLink({ href, label, download }: { href: string; label: string; download?: boolean }) {
  return (
    <a className={`chat-link ${download ? 'chat-link--file' : ''}`} href={href} title={href.startsWith('/api/files')
      ? decodeURIComponent(href.split('path=')[1]?.split('&')[0] ?? href) : href}
       target="_blank" rel="noopener noreferrer" download={download || undefined}>
      {label}
    </a>
  );
}

function urlLink(url: string, key: number, text?: string) {
  if (IMAGE_EXT.test(url)) return <SmartLink key={key} href={url} label={text ?? 'View image'} />;
  if (FILE_EXT.test(url)) return <SmartLink key={key} href={url} label={text ?? 'Download file'} />;
  const preview = url.match(/^https?:\/\/([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\.localhost(?::\d+)?\/?$/);
  if (preview) return <SmartLink key={key} href={url} label={text ?? `Open preview ${preview[1]}`} />;
  return <SmartLink key={key} href={url} label={text ?? `Go to ${host(url)}`} />;
}

function localFile(path: string, key: number) {
  const name = path.split('/').pop() ?? 'file';
  if (IMAGE_EXT.test(path)) {
    return (
      <span key={key} className="chat-file">
        <a href={fileUrl(path)} target="_blank" rel="noopener noreferrer" title={path}>
          <img className="chat-file__thumb" src={fileUrl(path)} alt={name} loading="lazy" />
        </a>
        <SmartLink href={fileUrl(path, true)} label="Download image" download />
      </span>
    );
  }
  const ext = name.split('.').pop()?.toUpperCase();
  return <SmartLink key={key} href={fileUrl(path, true)} label={`Download ${ext} file`} download />;
}

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(INLINE)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    const [all] = m;
    if (m[1]) {
      const [, label, href] = all.match(MD_LINK)!;
      out.push(LOCAL_PATH.test(href) && !/^https?:/.test(href)
        ? <SmartLink key={k++} href={fileUrl(href, true)} label={label} download />
        : urlLink(href, k++, label));
    } else if (m[4]) {
      const code = all.slice(1, -1);
      out.push(LOCAL_PATH.test(code) && new RegExp(`^${LOCAL_PATH.source}$`).test(code)
        ? localFile(code, k++) : <code key={k++}>{code}</code>);
    } else if (m[5]) out.push(<strong key={k++}>{all.slice(2, -2)}</strong>);
    else if (m[6]) out.push(urlLink(all, k++));
    else out.push(localFile(all, k++));
    last = i + all.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Internal tool names (mcp__inagentic__get_jira_ticket) read as "Get Jira ticket". The agent is told not to use
 * them, but this catches the ones that slip through. */
const TOOL_ID = /`?\bmcp__([A-Za-z0-9-]+)__([A-Za-z0-9_]*)`?/g;
const WORDS: Record<string, string> = { jira: 'Jira', github: 'GitHub', kpi: 'KPI', kpis: 'KPIs', pr: 'pull request',
  prs: 'pull requests', repo: 'repository', repos: 'repositories', api: 'API', mcp: 'MCP', url: 'URL', id: 'ID' };
export function humanizeTools(text: string): string {
  return text.replace(TOOL_ID, (_m, server: string, tool: string) => {
    if (!tool) return `the ${server.charAt(0).toUpperCase()}${server.slice(1)} tools`;
    const words = tool.split('_').filter(Boolean).map((w) => WORDS[w.toLowerCase()] ?? w.toLowerCase());
    const label = words.join(' ');
    return label.charAt(0).toUpperCase() + label.slice(1);
  });
}

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBER = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;

/** One paragraph block: lines, with runs of "- item" / "1. item" turned into real lists and "## Title" into a
 * small heading. */
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_SEP = /^\s*\|?(\s*:?-{2,}:?\s*\|)+\s*:?-{0,}:?\s*\|?\s*$/;
const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

/** A Markdown table, drawn like Slack's: a bordered grid with a bold header row (e.g. Kai's KPI scorecard). */
function Table({ rows }: { rows: string[] }) {
  const [head, , ...body] = rows;
  const titles = cells(head);
  return (
    <div className="chat-table" data-testid="chat-table">
      <table>
        <thead><tr>{titles.map((t, i) => <th key={i} scope="col">{inline(t)}</th>)}</tr></thead>
        <tbody>
          {body.map((r, i) => {
            const c = cells(r);
            const sub = c[0]?.startsWith('↳');
            return (
              <tr key={i} className={sub ? 'is-sub' : undefined}>
                {titles.map((_, j) => <td key={j}>{inline(c[j] ?? '')}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Block({ text }: { text: string }) {
  const lines = text.split('\n');
  const out: ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; start: number; items: string[] } | null = null;
  const flushPara = () => {
    if (para.length) out.push(<p key={out.length}>{para.map((line, j) => <span key={j}>{j > 0 && <br />}{inline(line)}</span>)}</p>);
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const items = list.items.map((it, j) => <li key={j}>{inline(it)}</li>);
    out.push(list.ordered ? <ol key={out.length} start={list.start === 1 ? undefined : list.start}>{items}</ol>
      : <ul key={out.length}>{items}</ul>);
    list = null;
  };
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (!line.trim()) {
      // a blank line ends a paragraph; a list carries on when the next item follows ("loose" list: 1, 2, 3 not 1, 1, 1)
      flushPara();
      const next = lines.slice(li + 1).find((l) => l.trim());
      const same = next && list && (/^\s{2,}\S/.test(next) || (list.ordered ? NUMBER.test(next) : BULLET.test(next) && !NUMBER.test(next)));
      if (!same) flushList();
      continue;
    }
    if (TABLE_ROW.test(line) && TABLE_SEP.test(lines[li + 1] ?? '')) {
      flushPara(); flushList();
      const rows = [line, lines[li + 1]];
      li += 2;
      while (li < lines.length && TABLE_ROW.test(lines[li])) rows.push(lines[li++]);
      li--;
      out.push(<Table key={out.length} rows={rows} />);
      continue;
    }
    const b = line.match(BULLET);
    const n = !b && line.match(NUMBER);
    const h = !b && !n && line.match(HEADING);
    if (b || n) {
      const ordered = !!n;
      flushPara();
      if (list && list.ordered !== ordered) flushList();
      list = list ?? { ordered, start: n ? Number(line.trim().match(/^\d+/)![0]) : 1, items: [] };
      list.items.push((b || n as RegExpMatchArray)[1]);
    } else if (h) {
      flushPara(); flushList();
      out.push(<h4 key={out.length}>{inline(h[1].replace(/\*\*/g, ''))}</h4>);
    } else if (list && /^\s{2,}\S/.test(line)) {
      list.items[list.items.length - 1] += ` ${line.trim()}`;   // wrapped list item
    } else {
      flushList();
      if (line.trim()) para.push(line);
    }
  }
  flushPara(); flushList();
  return <>{out}</>;
}

/**
 * Chat text: paragraphs, line breaks, lists, small headings, ``` code blocks ```, `code`, **bold**, and links shown
 * as short labels ("Go to github.com", "Download image") with the full address on hover. File paths the agent
 * mentions become download links (served by agent-api from its allowed folders), with a preview for images.
 */
/** Ticket keys of known projects (INA-21, also written with a non-breaking hyphen) as [INA-21](…/browse/INA-21);
 * not inside code, existing links or addresses. */
export function linkTickets(text: string, rules: TicketLinks[]): string {
  let out = text;
  for (const r of rules) {
    const keys = r.keys.filter((k) => /^[A-Z][A-Z0-9_]{0,19}$/.test(k));
    if (!keys.length || !r.url.includes('{key}')) continue;
    const re = new RegExp(`(?<![\\w/\\[#\`.-])(${keys.join('|')})[-\u2010\u2011\u2012\u2013](\\d{1,7})(?![\\w\\]\`])`, 'g');
    out = out.replace(re, (_m, k: string, n: string) => `[${k}-${n}](${r.url.replace('{key}', `${k}-${n}`)})`);
  }
  return out;
}

export function RichText({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const { config } = useSiteConfig();
  const rules = (config.plugins ?? []).flatMap((p) => (p.ticketLinks ? [p.ticketLinks] : []));
  // While a reply is still arriving, a table at its end is held back until it's complete: drawing it row by row
  // makes the columns jump about. A spinner stands in for it.
  const { shown, waiting } = streaming ? holdBackTable(text) : { shown: text, waiting: false };
  const blocks = humanizeTools(shown).split(/```[^\n]*\n?([\s\S]*?)```/g);
  return (
    <>
      {blocks.map((block, bi) => bi % 2 === 1
        ? <pre key={bi} className="chat-code"><code>{block.replace(/\n$/, '')}</code></pre>
        : block.trim() && <Block key={bi} text={rules.length ? linkTickets(block, rules) : block} />)}
      {waiting && (
        <div className="chat-table-pending" role="status" data-testid="table-pending">
          <span className="chat-spinner" aria-hidden="true" />Preparing the table…
        </div>
      )}
    </>
  );
}

const TABLE_LINE = /^\s*\|/;

/** Split off a table that is still being written at the end of a streaming reply. A table is complete once a line
 * that isn't part of it follows (usually a blank line). */
export function holdBackTable(text: string): { shown: string; waiting: boolean } {
  if ((text.match(/```/g) ?? []).length % 2 === 1) return { shown: text, waiting: false };   // inside code
  const lines = text.split('\n');
  let end = lines.length;
  if (end > 1 && lines[end - 1] === '' && TABLE_LINE.test(lines[end - 2])) end--;   // a row just ended: more may come
  let start = end;
  while (start > 0 && TABLE_LINE.test(lines[start - 1])) start--;
  if (start === end) return { shown: text, waiting: false };
  return { shown: lines.slice(0, start).join('\n').replace(/\s+$/, ''), waiting: true };
}
