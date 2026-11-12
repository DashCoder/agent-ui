import type { ReactNode } from 'react';

/** Page title (with an optional green status pill), one line under it, and buttons on the right. */
export function PageHeader({ title, subtitle, actions, status }: { title: string; subtitle?: ReactNode; actions?: ReactNode;
  status?: string }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-head__title">{title}{status && <span className="pill-status">{status}</span>}</h1>
        {subtitle && <p className="page-head__sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </div>
  );
}
