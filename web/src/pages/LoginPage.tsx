import { FormEvent, useState } from 'react';
import { api } from '../api/client';

export function LoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState('admin@local');
  const [password, setPassword] = useState('admin123!');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      onLoggedIn();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return <form className="card" onSubmit={submit}><h1>Sign in</h1>{error && <p>{error}</p>}<input value={email} onChange={(e) => setEmail(e.target.value)} /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /><button>Login</button></form>;
}
