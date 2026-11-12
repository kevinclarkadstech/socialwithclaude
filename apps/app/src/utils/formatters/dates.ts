import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

// The one place Day.js and its plugins are set up; the app uses these helpers.
dayjs.extend(relativeTime);

/** "5 minutes ago", "a day ago". */
export function timeAgo(iso: string, now: Date = new Date()): string {
  return dayjs(iso).from(now);
}
