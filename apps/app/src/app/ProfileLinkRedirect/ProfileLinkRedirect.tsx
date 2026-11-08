import { Navigate, useParams } from 'react-router';

/** A shared profile link (/users/:username) opens the profile in the Feed tab. */
export function ProfileLinkRedirect() {
  const { username } = useParams<{ username: string }>();
  return <Navigate to={`/feed/users/${username}`} replace />;
}
