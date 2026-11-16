import {
  IonButtons,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonPage,
  IonSearchbar,
  IonSpinner,
  IonToolbar,
} from '@ionic/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BackButton } from '../../../navigation';
import { useSearchResults, type SearchFn } from '../../../lib/api/useSearchResults';
import '../../styles/pages.css';
import './SearchPage.css';

const DEBOUNCE_MS = 250;

interface SearchPageProps<T> {
  /** Shown in the search bar, e.g. "Search listings". */
  placeholder: string;
  /** A page of results for a query. Stable: a module-level function or useCallback. */
  search: SearchFn<T>;
  renderItem: (item: T) => ReactNode;
  getKey: (item: T) => string;
  /** Before anything is typed, e.g. "Find posts by what they say." */
  hint: string;
  /** When nothing matches. */
  emptyText: (query: string) => string;
  /** Above the results for a query, e.g. matching people above posts. */
  renderHeader?: (query: string) => ReactNode;
}

/**
 * A search screen opened from a tab (its own route in the tab's stack): a
 * search bar, then the results for what's typed, a page at a time. Each
 * domain's search page supplies what to search and how to show a result.
 * Results update once typing pauses.
 */
export function SearchPage<T>({ placeholder, search, renderItem, getKey, hint, emptyText, renderHeader }: SearchPageProps<T>) {
  const searchbarRef = useRef<HTMLIonSearchbarElement>(null);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const { items, status, hasMore, loadMore } = useSearchResults(search, query);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  // Ready to type as soon as the page has slid in.
  useEffect(() => {
    const timer = setTimeout(() => void searchbarRef.current?.setFocus(), 350);
    return () => clearTimeout(timer);
  }, []);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <BackButton />
          </IonButtons>
          <IonSearchbar
            ref={searchbarRef}
            className="search-page__bar"
            placeholder={placeholder}
            value={text}
            debounce={0}
            onIonInput={(event) => setText(event.detail.value ?? '')}
          />
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {status === 'idle' && <p className="page-message">{hint}</p>}
        {query !== '' && renderHeader?.(query)}
        {status === 'loading' && (
          <div className="page-message">
            <IonSpinner />
          </div>
        )}
        {status === 'failed' && <p className="page-message">Couldn't search. Check your connection and try again.</p>}
        {status === 'ready' && items.length === 0 && <p className="page-message">{emptyText(query)}</p>}
        {items.map((item) => (
          <div key={getKey(item)}>{renderItem(item)}</div>
        ))}
        <IonInfiniteScroll disabled={!hasMore} onIonInfinite={(event) => void loadMore().finally(() => event.target.complete())}>
          <IonInfiniteScrollContent />
        </IonInfiniteScroll>
      </IonContent>
    </IonPage>
  );
}
