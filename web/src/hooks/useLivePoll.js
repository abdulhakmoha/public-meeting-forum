import { useEffect, useRef } from 'react';

/**
 * Silently re-fetch while a page is open so other sessions (moderator / citizen)
 * see new data without a manual browser refresh.
 */
export default function useLivePoll(callback, intervalMs = 8000) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    let timer = null;

    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        cbRef.current?.();
      } catch (_) { /* ignore */ }
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(tick, intervalMs);
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        tick();
        start();
      }
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs]);
}
