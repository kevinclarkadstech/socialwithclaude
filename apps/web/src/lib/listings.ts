import type { ListingPriceType } from "@myapp/shared/types/posts";

import type { api } from "./api";

type NewestListing = Awaited<ReturnType<typeof api.listings.getListings.query>>["items"][number];
type SearchedListing = Awaited<ReturnType<typeof api.search.listings.query>>["items"][number];

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
    seller: { username: string; avatarUrl: string | null };
};

/** From listings.getListings; null for a row without listing details. */
export function fromNewestListing(item: NewestListing): ListingSummary | null {
    if (!item.listing) return null;
    return {
        id: item.id,
        title: item.listing.title,
        priceType: item.listing.priceType,
        priceCents: item.listing.priceCents,
        status: item.listing.status,
        location: item.listing.location,
        imageUrl: item.thumbnail?.url ?? null,
        createdAt: item.createdAt,
        seller: { username: item.author.username, avatarUrl: item.author.avatarUrl },
    };
}

/** From search.listings. */
export function fromSearchedListing(item: SearchedListing): ListingSummary {
    return {
        id: item.id,
        title: item.title,
        priceType: item.priceType,
        priceCents: item.priceCents,
        status: item.status,
        location: item.location,
        imageUrl: item.imageUrl,
        createdAt: item.createdAt,
        seller: { username: item.author.username, avatarUrl: item.author.avatarUrl },
    };
}

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
