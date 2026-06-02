import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signInWithEmail(email);
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div style={styles.page}>
      <div style={styles.left}>
        <div style={styles.leftContent}>
          <div style={styles.logo}>MEWS <span style={styles.logoBadge}>POS</span></div>
          <h1 style={styles.headline}>Learn POS.<br />Go live faster.</h1>
          <p style={styles.subline}>
            Your step-by-step onboarding track for Mews Point of Sale.
            Watch, learn, and go live with confidence.
          </p>
          <div style={styles.decorLine} />
        </div>
      </div>

      <div style={styles.right}>
        <div className="fade-in" style={styles.formCard}>
          {!sent ? (
            <>
              <h2 style={styles.formTitle}>Sign in</h2>
              <p style={styles.formSub}>Enter your email and we'll send you a magic link.</p>

              <form onSubmit={handleSubmit} style={styles.form}>
                <div className="form-group">
                  <label className="form-label">Email address</label>
                  <input
                    type="email"
                    placeholder="you@property.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !email}
                  style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
                >
                  {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Sending…</> : 'Send magic link'}
                </button>
              </form>
            </>
          ) : (
            <div className="fade-in" style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={styles.checkIcon}>✓</div>
              <h2 style={{ ...styles.formTitle, marginBottom: '0.5rem' }}>Check your inbox</h2>
              <p style={styles.formSub}>
                We sent a sign-in link to <strong>{email}</strong>.<br />
                The link expires in 1 hour.
              </p>
              <button
                className="btn btn-ghost"
                onClick={() => { setSent(false); setEmail(''); }}
                style={{ marginTop: '1.5rem' }}
              >
                Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
  },
  left: {
    flex: '1 1 50%',
    background: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    padding: '4rem',
    position: 'relative',
    overflow: 'hidden',
  },
  leftContent: {
    position: 'relative',
    zIndex: 1,
  },
  logo: {
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    fontSize: '1rem',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: '0.08em',
    marginBottom: '3rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  logoBadge: {
    background: 'rgba(255,255,255,0.15)',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
  },
  headline: {
    fontFamily: 'var(--font-display)',
    fontSize: '3.5rem',
    color: '#fff',
    lineHeight: 1.1,
    marginBottom: '1.25rem',
  },
  subline: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: '1.05rem',
    lineHeight: 1.7,
    maxWidth: '380px',
  },
  decorLine: {
    width: '48px',
    height: '3px',
    background: 'rgba(255,255,255,0.3)',
    borderRadius: '99px',
    marginTop: '2.5rem',
  },
  right: {
    flex: '1 1 50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    background: 'var(--bg)',
  },
  formCard: {
    width: '100%',
    maxWidth: '420px',
  },
  formTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.75rem',
    marginBottom: '0.5rem',
  },
  formSub: {
    color: 'var(--text-muted)',
    fontSize: '0.9375rem',
    marginBottom: '1.75rem',
    lineHeight: 1.6,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  checkIcon: {
    width: '52px',
    height: '52px',
    background: 'var(--success-bg)',
    color: 'var(--success)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.4rem',
    fontWeight: 700,
    margin: '0 auto 1.25rem',
  },
};
