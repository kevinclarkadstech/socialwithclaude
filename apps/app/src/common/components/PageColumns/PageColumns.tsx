import { useSyncExternalStore, type ReactNode } from 'react';
import './PageColumns.css';

/** Where the rail shows: Ionic's xl breakpoint. Keep in step with PageColumns.css. */
const wide = '(min-width: 1200px)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(wide);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const isWide = () => window.matchMedia(wide).matches;

/**
 * A tab page's content in two columns on wide screens (≥1200px, Ionic's xl):
 * the page itself, and a rail of suggestions beside it that stays put while
 * the page scrolls. Narrower than that the rail isn't rendered at all, so
 * phones don't load what they won't show.
 */
export function PageColumns({ rail, children }: { rail: ReactNode; children: ReactNode }) {
  const showRail = useSyncExternalStore(subscribe, isWide);
  return (
    <div className="page-columns">
      <div className="page-columns__main">{children}</div>
      {showRail && (
        <aside className="page-columns__rail" aria-label="Suggestions">
          {rail}
        </aside>
      )}
    </div>
  );
}
