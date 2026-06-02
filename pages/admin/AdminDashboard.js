import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Nav from '../../components/shared/Nav';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const [chaptersRes, lessonsRes, usersRes, progressRes] = await Promise.all([
      supabase.from('chapters').select('id', { count: 'exact' }),
      supabase.from('lessons').select('id', { count: 'exact' }),
      supabase.from('user_profiles').select('id', { count: 'exact' }).eq('is_admin', false),
      supabase.from('progress').select('id', { count: 'exact' }),
    ]);

    setStats({
      chapters: chaptersRes.count || 0,
      lessons: lessonsRes.count || 0,
      learners: usersRes.count || 0,
      completions: progressRes.count || 0,
    });
    setLoading(false);
  }

  const tiles = [
    { label: 'Chapters', value: stats?.chapters, icon: '📚', path: '/admin/chapters', cta: 'Manage' },
    { label: 'Lessons', value: stats?.lessons, icon: '🎬', path: '/admin/chapters', cta: 'Manage' },
    { label: 'Learners', value: stats?.learners, icon: '👤', path: '/admin/users', cta: 'View users' },
    { label: 'Completions', value: stats?.completions, icon: '✅', path: '/admin/progress', cta: 'View progress' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Nav adminMode />

      <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
        <div className="fade-in" style={{ marginBottom: '2rem' }}>
          <h1 style={{ marginBottom: '0.25rem' }}>Admin</h1>
          <p style={{ color: 'var(--text-muted)' }}>Mews POS Academy — content & progress management</p>
        </div>

        <div style={styles.statsGrid}>
          {tiles.map((tile, i) => (
            <div
              key={tile.label}
              className="fade-in card"
              style={{ ...styles.statCard, animationDelay: `${i * 0.06}s`, cursor: 'pointer' }}
              onClick={() => navigate(tile.path)}
            >
              <div style={styles.statIcon}>{tile.icon}</div>
              <div style={styles.statValue}>
                {loading ? <div className="spinner" style={{ width: 20, height: 20 }} /> : tile.value}
              </div>
              <div style={styles.statLabel}>{tile.label}</div>
              <div style={styles.statCta}>{tile.cta} →</div>
            </div>
          ))}
        </div>

        <div style={styles.quickLinks}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Quick actions</h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/admin/chapters')}>
              + Add chapter / lesson
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/admin/progress')}>
              View progress report
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/admin/users')}>
              Manage users
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  statCard: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    transition: 'all var(--transition)',
  },
  statIcon: { fontSize: '1.5rem', marginBottom: '0.25rem' },
  statValue: { fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 700 },
  statLabel: { fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 },
  statCta: { fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.5rem' },
  quickLinks: {
    background: 'var(--surface)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
  },
};
