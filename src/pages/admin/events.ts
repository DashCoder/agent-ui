import type { AuditEvent } from '../../api/types';
import { PLUGINS } from '../../plugins';
import type { EventText } from '../../plugins/types';
import { humanize } from './humanize';

export { humanize };

const WHO: Record<string, string> = { hermes: 'Hermes', agent: 'Agent', github: 'GitHub', openrouter: 'OpenRouter', unknown: 'Unknown' };
export const who = (actor: string) => WHO[actor] ?? actor;

const ms = (n: unknown) => (typeof n === 'number' ? (n >= 1000 ? `${(n / 1000).toFixed(1)} s` : `${n} ms`) : '');

/** A log entry in words: the agent's own description if it has one, else a sensible default. */
export function explain(e: AuditEvent): EventText {
  for (const p of PLUGINS) {
    const t = p.describeEvent?.(e);
    if (t) return t;
  }
  const d = e.detail as Record<string, unknown>;
  if (e.action === 'llm.call') {
    const parts = [d.task ? `for ${String(d.task)}` : '', ms(d.ms),
      d.tokensIn !== undefined ? `${d.tokensIn} → ${d.tokensOut ?? '?'} tokens` : '',
      typeof d.cost === 'number' ? `$${d.cost.toFixed(4)}` : d.provider === 'ollama' ? 'free (local)' : ''].filter(Boolean);
    return { what: `Model: ${e.target}${d.provider ? ` (${String(d.provider)})` : ''}`, failed: !!d.error || !!d.blocked,
             blocked: !!d.blocked,
             more: [d.blocked ? `Blocked: ${String(d.blocked)}` : d.error ? `Failed: ${String(d.error)}` : '',
                    parts.join(' · ')].filter(Boolean).join(' — ') || undefined };
  }
  if (e.action === 'openrouter.trace') {
    const parts = [d.provider ? `via ${String(d.provider)}` : '', ms(d.ms),
      d.tokensIn !== undefined ? `${d.tokensIn} → ${d.tokensOut ?? '?'} tokens` : '',
      typeof d.cost === 'number' ? `$${d.cost.toFixed(4)}` : '',
      typeof d.ttftMs === 'number' ? `first token after ${ms(d.ttftMs)}` : '',
      d.finish && d.finish !== 'stop' ? `ended: ${String(d.finish)}` : '',
      d.apiKey ? `key “${String(d.apiKey)}”` : ''].filter(Boolean);
    const problem = d.blocked ? `Blocked: ${String(d.blocked)}` : d.error ? `Error${d.statusCode ? ` ${String(d.statusCode)}` : ''}: ${String(d.error)}` : '';
    return { what: `OpenRouter: ${e.target}`, failed: !!d.blocked || !!d.error, blocked: !!d.blocked,
             more: [problem, parts.join(' · ')].filter(Boolean).join(' — ') || undefined };
  }
  if (e.action === 'models.set') {
    return { what: `Model changed to ${String(d.model)} (${String(d.provider)})`, more: d.before ? `was ${String(d.before)}` : undefined };
  }
  if (e.action === 'models.hermes_set') {
    return { what: `Hermes now uses ${e.target} (${String(d.provider)})`, more: d.before ? `was ${String(d.before)}` : undefined };
  }
  if (e.action === 'models.hermes_failed') {
    return { what: `Hermes couldn't switch to ${e.target}; the previous model was put back`, more: String(d.error ?? ''), failed: true };
  }
  if (e.action === 'mcp.call') {
    const parts = [d.args as string, ms(d.ms)].filter(Boolean);
    return { what: `Tool: ${humanize(e.target)}`, failed: !!d.error,
             more: [d.error && d.reason ? `Failed: ${d.reason}` : '', parts.join(' · ')].filter(Boolean).join(' — ') || undefined };
  }
  const what = humanize(e.action.split('.').slice(1).join(' ') || e.action);
  const rest = Object.entries(d).filter(([k, v]) => k !== 'plugin' && v !== '' && v !== null && v !== undefined)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(' · ');
  return { what: `${what}${e.target ? `: ${e.target}` : ''}`, more: rest || undefined, failed: /fail/.test(e.action) };
}
