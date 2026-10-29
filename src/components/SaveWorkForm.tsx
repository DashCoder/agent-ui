import { useState, type FormEvent } from 'react';
import { api } from '../api/client';

interface Props {
  onDone: (email: string) => void;
  onCancel: () => void;
}

/** Two steps: email → 6-digit code. Links this browser's saved work to the email. */
export function SaveWorkForm({ onDone, onCancel }: Props) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (step === 'email') {
        const res = await api.saveWorkStart(email);
        setStep('code');
        setHint(res.devCode ? `Dev mode — your code is ${res.devCode}` : `We've emailed a 6-digit code to ${email}.`);
      } else {
        const res = await api.saveWorkVerify(email, code);
        onDone(res.email);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="savework" onSubmit={submit} aria-label="Save my work">
      {step === 'email' ? (
        <label className="savework__field">
          <span>Email to link your saved work to</span>
          <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
                 placeholder="you@example.com" autoComplete="email" />
        </label>
      ) : (
        <label className="savework__field">
          <span>{hint}</span>
          <input inputMode="numeric" pattern="[0-9]{6}" required autoFocus value={code}
                 onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                 placeholder="6-digit code" autoComplete="one-time-code" />
        </label>
      )}
      {error && <p className="savework__error" role="alert">{error}</p>}
      <div className="savework__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {step === 'email' ? 'Send code' : 'Verify'}
        </button>
      </div>
    </form>
  );
}
