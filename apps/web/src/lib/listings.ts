import type { ListingPriceType } from "@myapp/shared/types/posts";

/** What listing cards need, from either the newest listings or a search. */
export type ListingSummary = {
    id: string;
    title: string;
    priceType: ListingPriceType;
    priceCents: number | null;
    status: "available" | "pending" | "sold";
    location: string | null;
    imageUrl: string | null;
    createdAt: string;
    isSaved: boolean;
    seller: { username: string; avatarUrl: string | null };
};

const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const wholeDollars = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
});

/** "$1,249.50", "$250" (no cents when whole), "$250 · Negotiable", "Free". */
export function formatPrice({ priceType, priceCents }: Pick<ListingSummary, "priceType" | "priceCents">) {
    if (priceType === "free") return "Free";
    if (priceType === "multiple") return "Multiple items";
    const cents = priceCents ?? 0;
    const amount = (cents % 100 === 0 ? wholeDollars : dollars).format(cents / 100);
    return priceType === "negotiable" ? `${amount} · Negotiable` : amount;
}
