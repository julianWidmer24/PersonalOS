import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email, password);
    if (err) setError(err.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)] grid place-items-center text-[var(--bg)] text-[13px] font-bold">J</div>
            <span className="text-[15px] font-semibold tracking-tight text-[var(--t1)]">Personal OS</span>
          </div>
          <p className="text-[12.5px] text-[var(--t3)]">Sign in to your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] text-[var(--t2)] font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] text-[13px] text-[var(--t1)] placeholder:text-[var(--t4)] outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] text-[var(--t2)] font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] text-[13px] text-[var(--t1)] placeholder:text-[var(--t4)] outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-[var(--red)]/10 border border-[var(--red)]/20 text-[11.5px] text-[var(--red)]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full py-2.5 rounded-lg bg-[var(--accent)] text-[var(--bg)] text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-[var(--t4)]">
          No account yet? Contact your administrator.
        </p>
      </div>
    </div>
  );
}
