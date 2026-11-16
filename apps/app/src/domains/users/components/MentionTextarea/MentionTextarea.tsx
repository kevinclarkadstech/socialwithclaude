import { IonTextarea } from '@ionic/react';
import type { UserProfileSummary } from '@myapp/shared/domains';
import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { displayName } from '../../../../utils/formatters/names';
import { useMentionSuggestions } from '../../hooks/useMentionSuggestions/useMentionSuggestions';
import { activeMention } from '../../utils/activeMention/activeMention';
import { insertMention } from '../../utils/insertMention/insertMention';
import { UserAvatar } from '../UserAvatar/UserAvatar';
import './MentionTextarea.css';

type MentionTextareaProps = Omit<ComponentProps<typeof IonTextarea>, 'value' | 'onIonInput' | 'onIonFocus' | 'onIonBlur' | 'ref'> & {
  value: string;
  onValueChange: (value: string) => void;
  /** Where the suggestions open: "above" for a composer pinned to the bottom of the screen. */
  suggestionsPlacement: 'above' | 'below';
};

/**
 * An IonTextarea that suggests people to tag: typing "@" and the start of a
 * username or name lists matches, and picking one inserts "@username ".
 * Arrow keys move through the list, Enter or Tab picks, Escape closes it.
 *
 * The list is rendered over the page (a portal), placed against the
 * textarea: a toolbar (the comment and chat composers) clips anything that
 * sticks out of it.
 */
export function MentionTextarea({ value, onValueChange, suggestionsPlacement, onKeyDown, ...textareaProps }: MentionTextareaProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const textareaRef = useRef<HTMLIonTextareaElement>(null);
  const nativeRef = useRef<HTMLTextAreaElement | null>(null);
  const [caret, setCaret] = useState(value.length);
  // Only while typing here: tapping elsewhere closes the list.
  const [hasFocus, setHasFocus] = useState(false);
  // The "@" position the user closed the list for with Escape; it stays closed for that mention.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [highlighted, setHighlighted] = useState<{ query: string; index: number } | null>(null);

  const mention = activeMention({ text: value, caret });
  const open = hasFocus && mention !== null && mention.start !== dismissedAt;
  const suggestions = useMentionSuggestions(open ? mention.query : null);
  const showList = open && suggestions.length > 0;
  const highlightedIndex = highlighted && highlighted.query === mention?.query ? Math.min(highlighted.index, suggestions.length - 1) : 0;

  // The caret moves without typing too (clicks, arrow keys), so follow the native textarea.
  useEffect(() => {
    let element: HTMLTextAreaElement | null = null;
    const follow = () => {
      if (element) {
        setCaret(element.selectionStart);
      }
    };
    void textareaRef.current?.getInputElement().then((native) => {
      element = native;
      nativeRef.current = native;
      native.addEventListener('keyup', follow);
      native.addEventListener('click', follow);
    });
    return () => {
      element?.removeEventListener('keyup', follow);
      element?.removeEventListener('click', follow);
    };
  }, []);

  // Place the list against the textarea while it's shown, and again when the page scrolls or resizes.
  useLayoutEffect(() => {
    if (!showList) {
      return;
    }
    function place() {
      const wrapper = wrapperRef.current;
      const list = listRef.current;
      if (!wrapper || !list) {
        return;
      }
      const rect = wrapper.getBoundingClientRect();
      // At least 8px from the screen's edges.
      const left = Math.max(rect.left, 8);
      const right = Math.min(rect.right, window.innerWidth - 8);
      list.style.left = `${left}px`;
      list.style.width = `${right - left}px`;
      if (suggestionsPlacement === 'above') {
        list.style.top = '';
        list.style.bottom = `${window.innerHeight - rect.top + 4}px`;
      } else {
        list.style.bottom = '';
        list.style.top = `${rect.bottom + 4}px`;
      }
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [showList, suggestions, value, suggestionsPlacement]);

  function choose(user: UserProfileSummary) {
    if (!mention) {
      return;
    }
    const next = insertMention({ text: value, caret, mention, username: user.username });
    onValueChange(next.text);
    setCaret(next.caret);
    // Once the new value has reached the native textarea, put the caret after the mention.
    requestAnimationFrame(() => {
      nativeRef.current?.focus();
      nativeRef.current?.setSelectionRange(next.caret, next.caret);
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLIonTextareaElement>) {
    if (showList && mention) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setHighlighted({ query: mention.query, index: (highlightedIndex + step + suggestions.length) % suggestions.length });
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        choose(suggestions[highlightedIndex]);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        // Closing the list shouldn't also close a modal the textarea is in.
        event.stopPropagation();
        setDismissedAt(mention.start);
        return;
      }
    }
    onKeyDown?.(event);
  }

  return (
    <div ref={wrapperRef} className="mention-textarea">
      <IonTextarea
        {...textareaProps}
        ref={textareaRef}
        value={value}
        onIonInput={(event) => {
          onValueChange(event.detail.value ?? '');
          setCaret(nativeRef.current?.selectionStart ?? (event.detail.value ?? '').length);
        }}
        onKeyDown={handleKeyDown}
        onIonFocus={() => setHasFocus(true)}
        onIonBlur={() => setHasFocus(false)}
      />
      {showList && createPortal(
        <ul ref={listRef} className="mention-textarea__suggestions" role="listbox" aria-label="People to tag">
          {suggestions.map((user, index) => (
            <li key={user.userId} role="option" aria-selected={index === highlightedIndex}>
              <button
                type="button"
                className="mention-textarea__suggestion"
                // Keep the focus (and the keyboard) in the textarea.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(user)}
              >
                <UserAvatar user={user} size={28} />
                <span className="mention-textarea__name">{displayName(user)}</span>
                {(user.firstName || user.lastName) && <span className="mention-textarea__username">@{user.username}</span>}
              </button>
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </div>
  );
}
