import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Nav from '../components/shared/Nav';

// Load YouTube IFrame API
function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) { resolve(window.YT); return; }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
  });
}

function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url?.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default function LessonPage() {
  const { lessonId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [nextLesson, setNextLesson] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);
  const [watchedPct, setWatchedPct] = useState(0);

  const playerRef = useRef(null);
  const playerContainerRef = useRef(null);
  const maxWatchedRef = useRef(0); // furthest point watched (seconds)
  const durationRef = useRef(0);
  const intervalRef = useRef(null);
  const completedRef = useRef(false);

  useEffect(() => {
    loadLesson();
    return () => clearInterval(intervalRef.current);
  }, [lessonId]);

  async function loadLesson() {
    setLoading(true);

    const [lessonRes, progressRes] = await Promise.all([
      supabase
        .from('lessons')
        .select('*, chapters(*)')
        .eq('id', lessonId)
        .single(),
      supabase
        .from('progress')
        .select('id, watch_seconds')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle(),
    ]);

    if (lessonRes.data) {
      setLesson(lessonRes.data);
      setChapter(lessonRes.data.chapters);
    }

    if (progressRes.data) {
      setCompleted(true);
      completedRef.current = true;
      maxWatchedRef.current = progressRes.data.watch_seconds || 0;
    }

    setLoading(false);

    // Load next lesson
    if (lessonRes.data) {
      const { data: siblings } = await supabase
        .from('lessons')
        .select('id, title, order_index')
        .eq('chapter_id', lessonRes.data.chapter_id)
        .eq('published', true)
        .order('order_index');

      const idx = siblings?.findIndex(l => l.id === lessonId);
      if (idx !== undefined && idx >= 0 && siblings[idx + 1]) {
        setNextLesson(siblings[idx + 1]);
      } else {
        // Check first lesson of next chapter
        const { data: nextChapter } = await supabase
          .from('chapters')
          .select('*, lessons(*)')
          .eq('published', true)
          .gt('order_index', lessonRes.data.chapters.order_index)
          .order('order_index')
          .limit(1)
          .single();

        if (nextChapter) {
          const firstLesson = nextChapter.lessons
            .filter(l => l.published)
            .sort((a, b) => a.order_index - b.order_index)[0];
          if (firstLesson) setNextLesson(firstLesson);
        }
      }
    }
  }

  const initPlayer = useCallback(async (videoId) => {
    const YT = await loadYouTubeAPI();

    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    playerRef.current = new YT.Player(playerContainerRef.current, {
      videoId,
      playerVars: {
        controls: 1,
        disablekb: 0,
        rel: 0,
        modestbranding: 1,
      },
      events: {
        onReady: (e) => {
          durationRef.current = e.target.getDuration();
          setPlayerReady(true);

          // Start tracking interval
          intervalRef.current = setInterval(() => {
            if (!playerRef.current) return;
            const state = playerRef.current.getPlayerState();
            // 1 = playing
            if (state === 1) {
              const current = playerRef.current.getCurrentTime();
              const duration = playerRef.current.getDuration();

              // Anti-skip: if user jumped more than 3s ahead of max watched
              if (!completedRef.current && current > maxWatchedRef.current + 3) {
                playerRef.current.seekTo(maxWatchedRef.current, true);
                return;
              }

              // Update max watched
              if (current > maxWatchedRef.current) {
                maxWatchedRef.current = current;
              }

              // Update progress bar
              if (duration > 0) {
                setWatchedPct(Math.round((maxWatchedRef.current / duration) * 100));
              }
            }
          }, 1000);
        },

        onStateChange: (e) => {
          // 0 = ended
          if (e.data === 0 && !completedRef.current) {
            markCompleted();
          }
        },
      },
    });
  }, []);

  useEffect(() => {
    if (!loading && lesson) {
      const videoId = extractYouTubeId(lesson.youtube_url);
      if (videoId) initPlayer(videoId);
    }
    return () => clearInterval(intervalRef.current);
  }, [loading, lesson, initPlayer]);

  async function markCompleted() {
    completedRef.current = true;
    setCompleted(true);

    await supabase
      .from('progress')
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        watch_seconds: Math.round(durationRef.current),
        completed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,lesson_id' });
  }

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    </div>
  );

  if (!lesson) return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />
      <div className="container" style={{ padding: '2rem' }}>
        <div className="alert alert-error">Lesson not found.</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Nav />

      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '900px' }}>

        {/* Breadcrumb */}
        <div className="fade-in" style={styles.breadcrumb}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/track')} style={{ padding: '0.25rem 0' }}>
            ← Back to track
          </button>
          {chapter && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              · {chapter.title}
            </span>
          )}
        </div>

        {/* Lesson title */}
        <div className="fade-in" style={{ marginBottom: '1.25rem' }}>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{lesson.title}</h1>
          {lesson.description && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>{lesson.description}</p>
          )}
        </div>

        {/* Video player */}
        <div className="fade-in card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.25rem' }}>
          <div style={styles.videoWrapper}>
            <div ref={playerContainerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
          </div>

          {/* Watch progress */}
          <div style={styles.videoFooter}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {completed ? 'Watched' : 'Progress'}
              </span>
              <div className="progress-bar-track" style={{ flex: 1 }}>
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${completed ? 100 : watchedPct}%`,
                    background: completed ? 'var(--success)' : 'var(--accent)',
                  }}
                />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: completed ? 'var(--success)' : 'var(--text)' }}>
                {completed ? '✓ Complete' : `${watchedPct}%`}
              </span>
            </div>

            {!completed && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginLeft: '1rem' }}>
                Watch to the end to mark complete
              </span>
            )}
          </div>
        </div>

        {/* Completion + next */}
        {completed && (
          <div className="fade-in" style={styles.completionBanner}>
            <div style={styles.completionLeft}>
              <div style={styles.completionCheck}>✓</div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '0.125rem' }}>Lesson complete</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {nextLesson ? 'Ready for the next one.' : 'You\'ve finished this track!'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/track')}>
                Back to track
              </button>
              {nextLesson && (
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/lesson/${nextLesson.id}`)}>
                  Next: {nextLesson.title} →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  videoWrapper: {
    position: 'relative',
    paddingTop: '56.25%', // 16:9
    background: '#000',
  },
  videoFooter: {
    padding: '0.875rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTop: '1.5px solid var(--border)',
    gap: '1rem',
  },
  completionBanner: {
    background: 'var(--success-bg)',
    border: '1.5px solid #74c69d',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  completionLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.875rem',
  },
  completionCheck: {
    width: '36px',
    height: '36px',
    background: 'var(--success)',
    color: '#fff',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '1rem',
    flexShrink: 0,
  },
};
