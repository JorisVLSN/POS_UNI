import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Nav from '../components/shared/Nav';

export default function TrackPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [chapters, setChapters] = useState([]);
  const [completedLessonIds, setCompletedLessonIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);

    const [chaptersRes, progressRes] = await Promise.all([
      supabase
        .from('chapters')
        .select('*, lessons(*)')
        .eq('published', true)
        .order('order_index')
        .order('order_index', { foreignTable: 'lessons' }),
      supabase
        .from('progress')
        .select('lesson_id')
        .eq('user_id', user.id),
    ]);

    setChapters(chaptersRes.data || []);
    setCompletedLessonIds(new Set((progressRes.data || []).map(p => p.lesson_id)));
    setLoading(false);
  }

  function isLessonUnlocked(chapterIdx, lessonIdx, chapters) {
    // First lesson of first chapter always unlocked
    if (chapterIdx === 0 && lessonIdx === 0) return true;

    // Check all previous lessons in same chapter are complete
    const chapter = chapters[chapterIdx];
    const publishedLessons = chapter.lessons.filter(l => l.published);

    if (lessonIdx > 0) {
      const prevLesson = publishedLessons[lessonIdx - 1];
      return completedLessonIds.has(prevLesson?.id);
    }

    // First lesson of subsequent chapter: check last lesson of prev chapter
    const prevChapter = chapters[chapterIdx - 1];
    const prevChapterLessons = prevChapter.lessons.filter(l => l.published);
    const lastLesson = prevChapterLessons[prevChapterLessons.length - 1];
    return lastLesson ? completedLessonIds.has(lastLesson.id) : false;
  }

  const totalLessons = chapters.reduce((acc, c) => acc + c.lessons.filter(l => l.published).length, 0);
  const completedCount = chapters.reduce((acc, c) =>
    acc + c.lessons.filter(l => l.published && completedLessonIds.has(l.id)).length, 0
  );
  const overallPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Nav />

      <div className="container" style={{ padding: '2.5rem 1.5rem' }}>

        {/* Header */}
        <div className="fade-in" style={styles.header}>
          <div>
            <h1 style={{ marginBottom: '0.375rem' }}>Your learning track</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
              {profile?.properties?.name
                ? `${profile.properties.name} · `
                : ''
              }
              {completedCount} of {totalLessons} lessons completed
            </p>
          </div>
          <div style={styles.progressSummary}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Overall progress</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{overallPct}%</span>
            </div>
            <div className="progress-bar-track" style={{ width: '200px' }}>
              <div className="progress-bar-fill" style={{ width: `${overallPct}%` }} />
            </div>
          </div>
        </div>

        {/* Chapters */}
        <div style={styles.chapterList}>
          {chapters.map((chapter, ci) => {
            const publishedLessons = chapter.lessons.filter(l => l.published);
            const chapterCompleted = publishedLessons.filter(l => completedLessonIds.has(l.id)).length;
            const chapterPct = publishedLessons.length > 0
              ? Math.round((chapterCompleted / publishedLessons.length) * 100) : 0;

            return (
              <div key={chapter.id} className="fade-in card" style={{ ...styles.chapterCard, animationDelay: `${ci * 0.06}s` }}>
                <div style={styles.chapterHeader}>
                  <div style={styles.chapterMeta}>
                    <span style={styles.chapterNum}>Chapter {ci + 1}</span>
                    <h2 style={styles.chapterTitle}>{chapter.title}</h2>
                    {chapter.description && (
                      <p style={styles.chapterDesc}>{chapter.description}</p>
                    )}
                  </div>
                  <div style={styles.chapterProgress}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {chapterCompleted}/{publishedLessons.length}
                    </span>
                    {chapterPct === 100 && <span className="badge badge-success">✓ Done</span>}
                  </div>
                </div>

                <div className="progress-bar-track" style={{ marginBottom: '1.25rem' }}>
                  <div className="progress-bar-fill" style={{ width: `${chapterPct}%` }} />
                </div>

                <div style={styles.lessonList}>
                  {publishedLessons.map((lesson, li) => {
                    const done = completedLessonIds.has(lesson.id);
                    const unlocked = isLessonUnlocked(ci, li, chapters);

                    return (
                      <div
                        key={lesson.id}
                        style={{
                          ...styles.lessonRow,
                          opacity: unlocked ? 1 : 0.45,
                          cursor: unlocked ? 'pointer' : 'not-allowed',
                        }}
                        onClick={() => unlocked && navigate(`/lesson/${lesson.id}`)}
                      >
                        <div style={{ ...styles.lessonIcon, background: done ? 'var(--success-bg)' : unlocked ? 'var(--surface-2)' : 'var(--border)' }}>
                          {done ? (
                            <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>✓</span>
                          ) : unlocked ? (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>▶</span>
                          ) : (
                            <span style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>🔒</span>
                          )}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={styles.lessonTitle}>{lesson.title}</div>
                          {lesson.description && (
                            <div style={styles.lessonDesc}>{lesson.description}</div>
                          )}
                        </div>

                        {done && <span className="badge badge-success">Completed</span>}
                        {!done && unlocked && <span className="badge badge-info">Start →</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {chapters.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <p>No content published yet. Check back soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  progressSummary: {
    minWidth: '200px',
  },
  chapterList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  chapterCard: {
    padding: '1.75rem',
  },
  chapterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
    gap: '1rem',
  },
  chapterMeta: {
    flex: 1,
  },
  chapterNum: {
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--text-muted)',
    display: 'block',
    marginBottom: '0.25rem',
  },
  chapterTitle: {
    fontSize: '1.25rem',
    marginBottom: '0.25rem',
  },
  chapterDesc: {
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
    marginTop: '0.25rem',
  },
  chapterProgress: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexShrink: 0,
  },
  lessonList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  lessonRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.875rem',
    padding: '0.75rem',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    transition: 'all var(--transition)',
    background: 'var(--bg)',
  },
  lessonIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  lessonTitle: {
    fontSize: '0.9375rem',
    fontWeight: 500,
  },
  lessonDesc: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginTop: '0.125rem',
  },
};
