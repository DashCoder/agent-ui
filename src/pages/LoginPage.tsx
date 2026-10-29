import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { BrandMark } from '../components/Icons';
import { useSiteConfig } from '../hooks/useSiteConfig';

export function LoginPage() {
  const { config } = useSiteConfig();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(username, password);
      navigate(params.get('next') || '/admin', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-theme login">
      <form className="login__card" onSubmit={submit}>
        <div className="login__brand"><BrandMark /> {config.brand.adminTitle}</div>
        <h1>Admin sign in</h1>
        <label className="field"><span>Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </label>
        <label className="field"><span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                 autoComplete="current-password" required autoFocus />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn--dark" type="submit" disabled={busy}>Sign in</button>
        <Link to="/" className="login__back">← Back to chat</Link>
      </form>
    </div>
  );
}
