import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Nav from '../../components/shared/Nav';

function LessonModal({ lesson, chapterId, onSave, onClose }) {
  const [form, setForm] = useState({
    title: lesson?.title || '',
    description: lesson?.description || '',
    youtube_url: lesson?.youtube_url || '',
    order_index: lesson?.order_index ?? 0,
    published: lesson?.published ?? false,
    chapter_id: chapterId,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.youtube_url.trim()) { setError('YouTube URL is required'); return; }
    setSaving(true);
    setError('');

    const { error } = lesson?.id
      ? await supabase.from('lessons').update(form).eq('id', lesson.id)
      : await supabase.from('lessons').insert(form);

    setSaving(false);
    if (error) setError(error.message);
    else onSave();
  }

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={e => e.stopPropagation()} className="fade-in">
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>
          {lesson?.id ? 'Edit lesson' : 'New lesson'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Setting up your first product" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Optional" />
          </div>
          <div className="form-group">
            <label className="form-label">YouTube URL *</label>
            <input
              value={form.youtube_url}
              onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <span className="form-hint">Paste the full YouTube URL. Video should be unlisted.</span>
          </div>
          <div className="form-group">
            <label className="form-label">Order</label>
            <input type="number" value={form.order_index} onChange={e => setForm(f => ({ ...f, order_index: parseInt(e.target.value) || 0 }))} style={{ width: '100px' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} />
            <span style={{ fontSize: '0.9rem' }}>Published</span>
          </label>
        </div>

        {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save lesson'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminLessons() {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  useEffect(() => { loadData(); }, [chapterId]);

  async function loadData() {
    setLoading(true);
    const [chapterRes, lessonsRes] = await Promise.all([
      supabase.from('chapters').select('*').eq('id', chapterId).single(),
      supabase.from('lessons').select('*').eq('chapter_id', chapterId).order('order_index'),
    ]);
    setChapter(chapterRes.data);
    setLessons(lessonsRes.data || []);
    setLoading(false);
  }

  async function deleteLesson(id) {
    if (!window.confirm('Delete this lesson?')) return;
    await supabase.from('lessons').delete().eq('id', id);
    loadData();
  }

  async function togglePublished(lesson) {
    await supabase.from('lessons').update({ published: !lesson.published }).eq('id', lesson.id);
    loadData();
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Nav adminMode />

      <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
        <div className="fade-in" style={{ marginBottom: '0.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/chapters')} style={{ padding: '0.25rem 0', marginBottom: '0.75rem' }}>
            ← Back to chapters
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ marginBottom: '0.25rem' }}>
                {chapter?.title || 'Lessons'}
              </h1>
              <p style={{ color: 'var(--text-muted)' }}>Manage lessons in this chapter</p>
            </div>
            <button className="btn btn-primary" onClick={() => setModal({})}>+ New lesson</button>
          </div>
        </div>

        <hr className="divider" />

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {lessons.map((lesson, i) => (
              <div key={lesson.id} className="fade-in card" style={{ ...styles.lessonRow, animationDelay: `${i * 0.04}s` }}>
                <div style={styles.orderBadge}>{lesson.order_index}</div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>{lesson.title}</span>
                    <span className={`badge ${lesson.published ? 'badge-success' : 'badge-neutral'}`}>
                      {lesson.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  {lesson.description && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{lesson.description}</p>
                  )}
                  <a
                    href={lesson.youtube_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '0.8rem', color: 'var(--info)', textDecoration: 'underline' }}
                  >
                    {lesson.youtube_url.length > 60 ? lesson.youtube_url.slice(0, 60) + '…' : lesson.youtube_url}
                  </a>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => togglePublished(lesson)}>
                    {lesson.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setModal(lesson)}>Edit</button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--mews-red)' }} onClick={() => deleteLesson(lesson.id)}>Delete</button>
                </div>
              </div>
            ))}

            {lessons.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No lessons yet. Add the first one.
              </div>
            )}
          </div>
        )}
      </div>

      {modal !== null && (
        <LessonModal
          lesson={modal?.id ? modal : null}
          chapterId={chapterId}
          onSave={() => { setModal(null); loadData(); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

const styles = {
  lessonRow: {
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
    padding: '2rem', width: '100%', maxWidth: '560px',
    boxShadow: 'var(--shadow-lg)',
  },
};
