import z from "zod";

/** A page request: pass the previous page's `nextCursor` as `cursor` to get the next page. */
export const PageInputSchema = z.object({
    cursor: z.string().nullish(),
    limit: z.int().min(1).max(100).default(20),
});

export type PageInput = z.infer<typeof PageInputSchema>;

/** A page of items, and the cursor for the next page (null on the last page). */
export type Page<T> = {
    items: T[];
    nextCursor: string | null;
};
