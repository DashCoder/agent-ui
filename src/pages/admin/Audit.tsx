import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { AuditEvent } from '../../api/types';
import { PageHeader } from './AdminLayout';

const when = (t: number) => new Date(t * 1000).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

export function Audit() {
  const [items, setItems] = useState<AuditEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api.auditLog().then((r) => setItems(r.items)).catch((e) => setError((e as Error).message)); }, []);
  return (
    <>
      <PageHeader title="Audit trail" subtitle="Who did what, and when: logins, agent actions and approvals. Entries are never edited." />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="panel audit">
        <table className="audit__table">
          <thead><tr><th>When</th><th>Who</th><th>What</th><th>On</th><th>Details</th></tr></thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} data-testid="audit-row">
                <td>{when(e.ts)}</td><td>{e.actor}</td><td>{e.action}</td><td>{e.target}</td>
                <td className="audit__detail">{Object.entries(e.detail).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}</td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={5} className="muted">No events yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
