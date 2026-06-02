import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import Nav from '../../components/shared/Nav';

export default function AdminProgress() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOM, setFilterOM] = useState('');
  const [filterProperty, setFilterProperty] = useState('');
  const [expandedProperty, setExpandedProperty] = useState(null);

  useEffect(() => { loadReport(); }, []);

  async function loadReport() {
    setLoading(true);
    const { data: rows } = await supabase
      .from('admin_progress_report')
      .select('*');
    setData(rows || []);
    setLoading(false);
  }

  // Derive unique OM emails
  const omList = useMemo(() => {
    const set = new Set(data.map(r => r.onboarding_manager_email).filter(Boolean));
    return ['', ...Array.from(set).sort()];
  }, [data]);

  // Derive unique properties (filtered by OM if set)
  const propertyList = useMemo(() => {
    const filtered = filterOM ? data.filter(r => r.onboarding_manager_email === filterOM) : data;
    const map = new Map();
    filtered.forEach(r => { if (!map.has(r.property_id)) map.set(r.property_id, r.property_name); });
    return [{ id: '', name: 'All properties' }, ...Array.from(map.entries()).map(([id, name]) => ({ id, name }))];
  }, [data, filterOM]);

  // Aggregate data per property
  const propertyStats = useMemo(() => {
    let rows = data;
    if (filterOM) rows = rows.filter(r => r.onboarding_manager_email === filterOM);
    if (filterProperty) rows = rows.filter(r => r.property_id === filterProperty);

    const map = new Map();

    rows.forEach(row => {
      if (!map.has(row.property_id)) {
        map.set(row.property_id, {
          id: row.property_id,
          name: row.property_name,
          om: row.onboarding_manager_email,
          salesforce_id: row.salesforce_id,
          users: new Map(),
          totalLessons: new Set(),
          completedLessons: new Set(),
        });
      }

      const prop = map.get(row.property_id);
      prop.totalLessons.add(row.lesson_id);
      if (row.completed) prop.completedLessons.add(`${row.user_id}:${row.lesson_id}`);

      if (!prop.users.has(row.user_id)) {
        prop.users.set(row.user_id, {
          id: row.user_id,
          email: row.user_email,
          lessons: [],
        });
      }
      prop.users.get(row.user_id).lessons.push(row);
    });

    return Array.from(map.values()).map(p => {
      const users = Array.from(p.users.values());
      const totalSlots = users.length * p.totalLessons.size;
      const completedSlots = users.reduce((acc, u) => acc + u.lessons.filter(l => l.completed).length, 0);
      const pct = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;

      return {
        ...p,
        users,
        userCount: users.length,
        totalLessonCount: p.totalLessons.size,
        completedSlots,
        totalSlots,
        pct,
      };
    }).sort((a, b) => b.pct - a.pct);
  }, [data, filterOM, filterProperty]);

  function exportCSV() {
    const rows = [
      ['Property', 'Onboarding Manager', 'User Email', 'Chapter', 'Lesson', 'Completed', 'Completed At'],
    ];
    let filtered = data;
    if (filterOM) filtered = filtered.filter(r => r.onboarding_manager_email === filterOM);
    if (filterProperty) filtered = filtered.filter(r => r.property_id === filterProperty);

    filtered.forEach(r => {
      rows.push([
        r.property_name, r.onboarding_manager_email, r.user_email,
        r.chapter_title, r.lesson_title,
        r.completed ? 'Yes' : 'No',
        r.completed_at ? new Date(r.completed_at).toLocaleDateString() : '',
      ]);
    });

    const csv = rows.map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progress-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Nav adminMode />

      <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
        <div className="fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ marginBottom: '0.25rem' }}>Progress report</h1>
            <p style={{ color: 'var(--text-muted)' }}>Track completion per property and onboarding manager</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
            ↓ Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="card fade-in" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1 1 220px', minWidth: 0 }}>
            <label className="form-label">Onboarding manager</label>
            <select value={filterOM} onChange={e => { setFilterOM(e.target.value); setFilterProperty(''); }}>
              <option value="">All OMs</option>
              {omList.filter(Boolean).map(om => (
                <option key={om} value={om}>{om}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: '1 1 220px', minWidth: 0 }}>
            <label className="form-label">Property</label>
            <select value={filterProperty} onChange={e => setFilterProperty(e.target.value)}>
              {propertyList.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {(filterOM || filterProperty) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilterOM(''); setFilterProperty(''); }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Summary bar */}
        {!loading && (
          <div className="fade-in" style={styles.summaryBar}>
            <div style={styles.summaryItem}>
              <span style={styles.summaryValue}>{propertyStats.length}</span>
              <span style={styles.summaryLabel}>Properties</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryValue}>{propertyStats.reduce((a, p) => a + p.userCount, 0)}</span>
              <span style={styles.summaryLabel}>Learners</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryValue}>
                {propertyStats.length > 0
                  ? Math.round(propertyStats.reduce((a, p) => a + p.pct, 0) / propertyStats.length)
                  : 0}%
              </span>
              <span style={styles.summaryLabel}>Avg completion</span>
            </div>
          </div>
        )}

        {/* Property rows */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {propertyStats.map((prop, i) => (
              <div key={prop.id} className="fade-in card" style={{ padding: 0, overflow: 'hidden', animationDelay: `${i * 0.04}s` }}>
                {/* Property header */}
                <div
                  style={styles.propHeader}
                  onClick={() => setExpandedProperty(expandedProperty === prop.id ? null : prop.id)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
                      <span style={{ fontWeight: 600 }}>{prop.name}</span>
                      {prop.salesforce_id && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>SF: {prop.salesforce_id}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', align: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        OM: {prop.om || 'Unassigned'}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {prop.userCount} learner{prop.userCount !== 1 ? 's' : ''}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {prop.completedSlots}/{prop.totalSlots} completions
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: prop.pct === 100 ? 'var(--success)' : 'var(--text)' }}>
                        {prop.pct}%
                      </div>
                      <div className="progress-bar-track" style={{ width: '80px' }}>
                        <div className="progress-bar-fill" style={{
                          width: `${prop.pct}%`,
                          background: prop.pct === 100 ? 'var(--success)' : 'var(--accent)',
                        }} />
                      </div>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {expandedProperty === prop.id ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Expanded: per-user detail */}
                {expandedProperty === prop.id && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Learner</th>
                            <th>Chapter</th>
                            <th>Lesson</th>
                            <th>Status</th>
                            <th>Completed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {prop.users.flatMap(u =>
                            u.lessons
                              .sort((a, b) => a.chapter_order - b.chapter_order || a.lesson_order - b.lesson_order)
                              .map((l, li) => (
                                <tr key={`${u.id}-${l.lesson_id}`}>
                                  {li === 0 && <td rowSpan={u.lessons.length} style={{ fontWeight: 500, verticalAlign: 'top', paddingTop: '0.875rem' }}>{u.email}</td>}
                                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{l.chapter_title}</td>
                                  <td>{l.lesson_title}</td>
                                  <td>
                                    <span className={`badge ${l.completed ? 'badge-success' : 'badge-neutral'}`}>
                                      {l.completed ? '✓ Done' : 'Not watched'}
                                    </span>
                                  </td>
                                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    {l.completed_at ? new Date(l.completed_at).toLocaleDateString() : '—'}
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {propertyStats.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No data available with current filters.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  summaryBar: {
    display: 'flex',
    gap: '1.5rem',
    marginBottom: '1.25rem',
    padding: '1rem 1.25rem',
    background: 'var(--surface)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem',
  },
  summaryValue: {
    fontSize: '1.4rem',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
  },
  summaryLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  propHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.25rem 1.5rem',
    cursor: 'pointer',
    transition: 'background var(--transition)',
  },
};
