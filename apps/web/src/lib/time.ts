import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

/** "5 minutes ago", "2 days ago". */
export function timeAgo(date: string | Date) {
    return dayjs(date).fromNow();
}

/** Full date and time, for tooltips: "Oct 18, 2026 8:48 PM". */
export function fullDateTime(date: string | Date) {
    return dayjs(date).format("MMM D, YYYY h:mm A");
}
