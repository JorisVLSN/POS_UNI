import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Nav from '../../components/shared/Nav';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [usersRes, propsRes] = await Promise.all([
      supabase.from('user_profiles').select('*, properties(id, name)').order('created_at', { ascending: false }),
      supabase.from('properties').select('id, name').order('name'),
    ]);
    setUsers(usersRes.data || []);
    setProperties(propsRes.data || []);
    setLoading(false);
  }

  async function updateProperty(userId, propertyId) {
    setSaving(userId);
    await supabase
      .from('user_profiles')
      .update({ property_id: propertyId || null })
      .eq('id', userId);
    setSaving(null);
    loadData();
  }

  async function toggleAdmin(user) {
    if (!window.confirm(`${user.is_admin ? 'Remove admin from' : 'Make admin'}: ${user.email}?`)) return;
    await supabase.from('user_profiles').update({ is_admin: !user.is_admin }).eq('id', user.id);
    loadData();
  }

  const filtered = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Nav adminMode />

      <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
        <div className="fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ marginBottom: '0.25rem' }}>Users</h1>
            <p style={{ color: 'var(--text-muted)' }}>Manage learners and assign them to properties</p>
          </div>
          <div style={{ maxWidth: '280px', width: '100%' }}>
            <input
              placeholder="Search by email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : (
          <div className="table-wrapper fade-in">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Linked property</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 500 }}>{user.email}</td>
                    <td>
                      <span className={`badge ${user.is_admin ? 'badge-warning' : 'badge-neutral'}`}>
                        {user.is_admin ? 'Admin' : 'Learner'}
                      </span>
                    </td>
                    <td>
                      <select
                        value={user.property_id || ''}
                        onChange={e => updateProperty(user.id, e.target.value)}
                        disabled={saving === user.id}
                        style={{ maxWidth: '220px', fontSize: '0.85rem', padding: '0.35rem 0.6rem' }}
                      >
                        <option value="">— No property —</option>
                        {properties.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      {saving === user.id && <span className="spinner" style={{ width: 14, height: 14, display: 'inline-block', marginLeft: '0.5rem' }} />}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => toggleAdmin(user)}
                        style={{ fontSize: '0.8rem' }}
                      >
                        {user.is_admin ? 'Remove admin' : 'Make admin'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
