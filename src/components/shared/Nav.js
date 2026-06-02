import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Nav({ adminMode = false }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const adminLinks = [
    { path: '/admin', label: 'Overview' },
    { path: '/admin/chapters', label: 'Chapters' },
    { path: '/admin/progress', label: 'Progress' },
    { path: '/admin/users', label: 'Users' },
  ];

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <nav style={styles.nav}>
      <div className="container" style={styles.inner}>
        <div style={styles.brand} onClick={() => navigate(adminMode ? '/admin' : '/track')}>
          <span style={styles.brandName}>MEWS</span>
          <span style={styles.brandBadge}>POS Academy</span>
        </div>

        {adminMode && (
          <div style={styles.links}>
            {adminLinks.map(link => (
              <button
                key={link.path}
                className="btn btn-ghost btn-sm"
                onClick={() => navigate(link.path)}
                style={{
                  color: location.pathname === link.path ? 'var(--text)' : 'var(--text-muted)',
                  fontWeight: location.pathname === link.path ? 600 : 400,
                }}
              >
                {link.label}
              </button>
            ))}
          </div>
        )}

        <div style={styles.right}>
          {profile && (
            <span style={styles.email}>{profile.email}</span>
          )}
          {adminMode && (
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/track')}>
              View as learner
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    background: 'var(--surface)',
    borderBottom: '1.5px solid var(--border)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    padding: '0.875rem 1.5rem',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
  },
  brandName: {
    fontFamily: 'var(--font-body)',
    fontWeight: 700,
    fontSize: '0.9rem',
    letterSpacing: '0.06em',
    color: 'var(--text)',
  },
  brandBadge: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontWeight: 400,
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    flex: 1,
    marginLeft: '1rem',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginLeft: 'auto',
  },
  email: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
};
