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

/**
 * Chat text: paragraphs, line breaks, ``` code blocks ```, `code`, **bold**, and links shown as short labels
 * ("Go to github.com", "Download image") with the full address on hover. File paths the agent mentions
 * become download links (served by agent-api from its allowed folders), with a preview for images.
 */
export function RichText({ text }: { text: string }) {
  const blocks = text.split(/```[^\n]*\n?([\s\S]*?)```/g);
  return (
    <>
      {blocks.map((block, bi) => bi % 2 === 1
        ? <pre key={bi} className="chat-code"><code>{block.replace(/\n$/, '')}</code></pre>
        : block.split(/\n{2,}/).filter((p) => p.trim()).map((p, i) => (
          <p key={`${bi}-${i}`}>{p.split('\n').map((line, j) => (
            <span key={j}>{j > 0 && <br />}{inline(line)}</span>))}</p>
        )))}
    </>
  );
}
