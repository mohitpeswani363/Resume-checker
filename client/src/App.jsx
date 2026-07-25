import { useCallback, useEffect, useMemo, useState } from 'react';

const MIN_CHARS = 200;
// Empty VITE_API_URL in production = same-origin (/api/...) when server serves the built client
const API_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

function App() {
  const [resumeText, setResumeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [sourceType, setSourceType] = useState('text');
  const [token, setToken] = useState(() => localStorage.getItem('rc_token'));
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });

  const charCount = resumeText.length;
  const isValidLength = charCount >= MIN_CHARS;
  const charsRemaining = Math.max(MIN_CHARS - charCount, 0);
  const isBusy = loading || uploading;

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  const canSubmit = useMemo(
    () => isValidLength && !isBusy && resumeText.trim().length > 0,
    [isValidLength, isBusy, resumeText]
  );

  const loadHistory = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/check/history`, { headers: authHeaders });
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch {
      /* ignore history errors */
    }
  }, [token, authHeaders]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setHistory([]);
      return;
    }

    fetch(`${API_URL}/api/auth/me`, { headers: authHeaders })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setUser(data.user);
        loadHistory();
      })
      .catch(() => {
        localStorage.removeItem('rc_token');
        setToken(null);
      });
  }, [token, authHeaders, loadHistory]);

  function handleLogout() {
    localStorage.removeItem('rc_token');
    setToken(null);
    setUser(null);
    setHistory([]);
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setError('');

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body =
      authMode === 'login'
        ? { email: authForm.email, password: authForm.password }
        : authForm;

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Authentication failed.');

      localStorage.setItem('rc_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setShowAuth(false);
      setAuthForm({ email: '', password: '', name: '' });
    } catch (authError) {
      setError(authError.message);
    }
  }

  async function handlePdfUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'PDF upload failed.');

      setResumeText(data.text);
      setSourceType('pdf');
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ resumeText, sourceType }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Something went wrong.');

      setResult(data);
      if (token) loadHistory();
    } catch (submitError) {
      setError(submitError.message || 'Unable to check resume. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-violet-50">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10 text-center">
          <div className="mb-4 flex items-center justify-end gap-2">
            {user ? (
              <>
                <span className="text-sm text-slate-600">Hi, {user.name}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  Log out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuth(true)}
                className="rounded-lg bg-violet-100 px-3 py-1.5 text-sm font-medium text-violet-700 transition hover:bg-violet-200"
              >
                Sign in
              </button>
            )}
          </div>

          <p className="mb-3 inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700">
            AI-powered resume review
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Resume<span className="text-violet-500">Checker</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
            Paste your resume or upload a PDF to get instant feedback on structure, clarity, and impact.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-6 text-center">
            <p className="mb-2 text-sm font-medium text-slate-700">Upload a PDF resume</p>
            <label className="inline-flex cursor-pointer items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-violet-600 shadow-sm ring-1 ring-violet-200 transition hover:bg-violet-50">
              {uploading ? 'Extracting text...' : 'Choose PDF file'}
              <input
                type="file"
                accept="application/pdf"
                onChange={handlePdfUpload}
                disabled={isBusy}
                className="hidden"
              />
            </label>
            <p className="mt-2 text-xs text-slate-500">Max 5 MB · text-based PDFs work best</p>
          </div>

          <div className="relative">
            <div className="absolute inset-x-0 -top-3 flex justify-center">
              <span className="bg-slate-50 px-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                or paste text
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="resume" className="mb-2 block text-sm font-medium text-slate-700">
              Your resume
            </label>
            <textarea
              id="resume"
              rows={14}
              value={resumeText}
              onChange={(event) => {
                setResumeText(event.target.value);
                setSourceType('text');
              }}
              placeholder="Paste your full resume text here..."
              className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
            />
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className={isValidLength ? 'text-emerald-600' : 'text-slate-500'}>
                {charCount} characters
                {!isValidLength && ` · ${charsRemaining} more needed`}
                {sourceType === 'pdf' && isValidLength && ' · from PDF'}
              </span>
              {!isValidLength && (
                <span className="text-amber-600">Minimum {MIN_CHARS} characters required</span>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-violet-500 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none sm:w-auto"
          >
            {loading ? (
              <>
                <svg className="mr-2 h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </>
            ) : (
              'Roast my resume'
            )}
          </button>
        </form>

        {result && (
          <section className="fade-in mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold text-slate-900">Your roast</h2>
                  {result.feedback.source && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-600">
                      {result.feedback.source === 'ai' ? 'AI powered' : 'Rule-based'}
                    </span>
                  )}
                  {result.feedback.aiFallback && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      AI fallback
                    </span>
                  )}
                </div>
                <p className="mt-1 text-slate-600">{result.feedback.summary}</p>
              </div>
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-violet-100 text-2xl font-bold text-violet-600">
                {result.score}
              </div>
            </div>

            {result.feedback.roast && (
              <div className="mb-6 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-rose-50 p-5">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-orange-700">
                  The roast
                </h3>
                <p className="text-base leading-relaxed text-orange-950">{result.feedback.roast}</p>
              </div>
            )}

            {result.feedback.suggestions?.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-violet-700">
                  How to level up
                </h3>
                <div className="space-y-3">
                  {result.feedback.suggestions.map((item) => (
                    <div
                      key={`${item.title}-${item.detail}`}
                      className="rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3"
                    >
                      <p className="font-semibold text-violet-900">{item.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-violet-950/90">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.feedback.strengths?.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">Strengths</h3>
                <ul className="space-y-2">
                  {result.feedback.strengths.map((item) => (
                    <li key={item} className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      <span aria-hidden="true">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.feedback.improvements?.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-amber-700">Improvements</h3>
                <ul className="space-y-2">
                  {result.feedback.improvements.map((item) => (
                    <li key={item} className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      <span aria-hidden="true">→</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.feedback.checks?.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Checklist</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {result.feedback.checks.map((check) => (
                    <div
                      key={check.label}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        check.passed
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <p className="font-medium">{check.label}</p>
                      {!check.passed && check.tip && (
                        <p className="mt-1 text-xs text-slate-500">{check.tip}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {user && history.length > 0 && (
          <section className="fade-in mt-10">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Your recent checks</h2>
            <div className="space-y-2">
              {history.map((item) => {
                const dateStr = item.createdAt
                  ? new Date(item.createdAt.includes('T') ? item.createdAt : item.createdAt.replace(' ', 'T') + 'Z').toLocaleDateString()
                  : 'Recent';
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{item.feedback?.summary || 'Resume check'}</p>
                      <p className="text-xs text-slate-500">
                        {dateStr} · {item.sourceType}
                      </p>
                    </div>
                    <span className="rounded-full bg-violet-100 px-3 py-1 font-semibold text-violet-600">
                      {item.score}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="fade-in w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {authMode === 'login' ? 'Sign in' : 'Create account'}
              </h2>
              <button
                type="button"
                onClick={() => setShowAuth(false)}
                className="text-slate-400 transition hover:text-slate-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                  />
                </div>
              )}
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-violet-500 py-2.5 font-semibold text-white transition hover:bg-violet-600"
              >
                {authMode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-slate-600">
              {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="font-medium text-violet-600 hover:text-violet-700"
              >
                {authMode === 'login' ? 'Register' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
