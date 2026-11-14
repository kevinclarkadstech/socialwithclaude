import type { PostListing } from "@myapp/shared/domains";

import type { PostListingRow } from "../../types";

export function toPostListing(row: PostListingRow): PostListing {
    const fields = {
        postId: row.postId,
        title: row.title,
        description: row.description,
        condition: row.condition,
        status: row.status,
        isNegotiable: row.isNegotiable,
    };
    switch (row.priceType) {
        case "fixed":
            return { ...fields, type: "fixed", priceCents: row.priceCents! };
        case "free":
            return { ...fields, type: "free" };
        case "multiple":
            return { ...fields, type: "multiple" };
    }
}
