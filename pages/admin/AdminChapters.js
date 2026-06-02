import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Nav from '../../components/shared/Nav';

function ChapterModal({ chapter, onSave, onClose }) {
  const [form, setForm] = useState({
    title: chapter?.title || '',
    description: chapter?.description || '',
    order_index: chapter?.order_index ?? 0,
    published: chapter?.published ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');

    const { error } = chapter?.id
      ? await supabase.from('chapters').update(form).eq('id', chapter.id)
      : await supabase.from('chapters').insert(form);

    setSaving(false);
    if (error) setError(error.message);
    else onSave();
  }

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={e => e.stopPropagation()} className="fade-in">
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>
          {chapter?.id ? 'Edit chapter' : 'New chapter'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Getting started with Mews POS" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Optional short description" />
          </div>
          <div className="form-group">
            <label className="form-label">Order</label>
            <input type="number" value={form.order_index} onChange={e => setForm(f => ({ ...f, order_index: parseInt(e.target.value) || 0 }))} style={{ width: '100px' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} />
            <span style={{ fontSize: '0.9rem' }}>Published (visible to learners)</span>
          </label>
        </div>

        {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save chapter'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminChapters() {
  const navigate = useNavigate();
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | {} | chapter object

  useEffect(() => { loadChapters(); }, []);

  async function loadChapters() {
    setLoading(true);
    const { data } = await supabase
      .from('chapters')
      .select('*, lessons(id, published)')
      .order('order_index');
    setChapters(data || []);
    setLoading(false);
  }

  async function deleteChapter(id) {
    if (!window.confirm('Delete this chapter and all its lessons?')) return;
    await supabase.from('chapters').delete().eq('id', id);
    loadChapters();
  }

  async function togglePublished(chapter) {
    await supabase.from('chapters').update({ published: !chapter.published }).eq('id', chapter.id);
    loadChapters();
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Nav adminMode />

      <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
        <div className="fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
          <div>
            <h1 style={{ marginBottom: '0.25rem' }}>Chapters</h1>
            <p style={{ color: 'var(--text-muted)' }}>Manage your learning track structure</p>
          </div>
          <button className="btn btn-primary" onClick={() => setModal({})}>+ New chapter</button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {chapters.map((chapter, i) => {
              const lessonCount = chapter.lessons?.length || 0;
              const publishedCount = chapter.lessons?.filter(l => l.published).length || 0;

              return (
                <div key={chapter.id} className="fade-in card" style={{ ...styles.chapterRow, animationDelay: `${i * 0.04}s` }}>
                  <div style={styles.orderBadge}>{chapter.order_index}</div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '1rem' }}>{chapter.title}</span>
                      <span className={`badge ${chapter.published ? 'badge-success' : 'badge-neutral'}`}>
                        {chapter.published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    {chapter.description && (
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{chapter.description}</p>
                    )}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                      {lessonCount} lesson{lessonCount !== 1 ? 's' : ''} · {publishedCount} published
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/chapters/${chapter.id}/lessons`)}>
                      Lessons
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => togglePublished(chapter)}>
                      {chapter.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setModal(chapter)}>Edit</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--mews-red)' }} onClick={() => deleteChapter(chapter.id)}>Delete</button>
                  </div>
                </div>
              );
            })}

            {chapters.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No chapters yet. Create your first one.
              </div>
            )}
          </div>
        )}
      </div>

      {modal !== null && (
        <ChapterModal
          chapter={modal?.id ? modal : null}
          onSave={() => { setModal(null); loadChapters(); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

const styles = {
  chapterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.25rem 1.5rem',
  },
  orderBadge: {
    width: '32px',
    height: '32px',
    background: 'var(--surface-2)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
};

const modalStyles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '1rem',
  },
  modal: {
    background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
    padding: '2rem', width: '100%', maxWidth: '520px',
    boxShadow: 'var(--shadow-lg)',
  },
};
