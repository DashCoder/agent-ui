import type { Approval } from '../api/types';

interface Props {
  approval: Approval;
  onAnswer: (approve: boolean) => void;
}

/** Shown when the agent wants to do something risky (run a command, delete, pay…). */
export function ApprovalCard({ approval, onAnswer }: Props) {
  return (
    <div className="approval" role="alertdialog" aria-label="Approval needed" data-testid="approval">
      <p className="approval__title">Approval needed</p>
      <p className="approval__prompt">{approval.prompt}</p>
      <div className="approval__actions">
        <button type="button" className="btn btn--ghost" onClick={() => onAnswer(false)}>Deny</button>
        <button type="button" className="btn btn--primary" onClick={() => onAnswer(true)}>Approve</button>
      </div>
    </div>
  );
}
