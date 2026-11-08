import type { MouseEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useTabHref } from '../../../../navigation';
import './AuthorLink.css';

interface AuthorLinkProps {
  username: string;
  children: ReactNode;
  slot?: string;
  /** False renders just the children, e.g. on the author's own profile. */
  enabled?: boolean;
}

/** Opens a post's or comment's author's profile, in the current tab. A real link, so it works with a keyboard and screen reader. */
export function AuthorLink({ username, children, slot, enabled = true }: AuthorLinkProps) {
  const navigate = useNavigate();
  const tabHref = useTabHref();
  const href = tabHref(`users/${username}`);

  if (!enabled) {
    return <span slot={slot}>{children}</span>;
  }

  function open(event: MouseEvent) {
    event.preventDefault();
    // Inside a card that opens its post: open the profile instead.
    event.stopPropagation();
    navigate(href);
  }

  return (
    <a slot={slot} href={href} className="author-link" onClick={open}>
      {children}
    </a>
  );
}
