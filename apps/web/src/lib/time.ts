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

/** "8:48 PM": a message's time within its day. */
export function clockTime(date: string | Date) {
    return dayjs(date).format("h:mm A");
}

/** "Today", "Yesterday", "Mon, Oct 12", or "Oct 12, 2025" for other years. */
export function dayLabel(date: string | Date) {
    const d = dayjs(date);
    const now = dayjs();
    if (d.isSame(now, "day")) return "Today";
    if (d.isSame(now.subtract(1, "day"), "day")) return "Yesterday";
    return d.format(d.isSame(now, "year") ? "ddd, MMM D" : "MMM D, YYYY");
}

/** True if both are on the same calendar day (local time). */
export function isSameDay(a: string | Date, b: string | Date) {
    return dayjs(a).isSame(b, "day");
}

/** Short relative time for lists: "now", "5m", "3h", "2d", then "Oct 12". */
export function shortTimeAgo(date: string | Date) {
    const d = dayjs(date);
    const minutes = dayjs().diff(d, "minute");
    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    const hours = dayjs().diff(d, "hour");
    if (hours < 24) return `${hours}h`;
    const days = dayjs().diff(d, "day");
    if (days < 7) return `${days}d`;
    return d.format(d.isSame(dayjs(), "year") ? "MMM D" : "MMM D, YYYY");
}
