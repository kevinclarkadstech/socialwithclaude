import { schema, type Database } from "../db";

export async function submitFeedback(
    db: Database,
    values: {
        userId: string;
        category: (typeof schema.feedbackCategories)[number];
        message: string;
        pageUrl: string | null;
        userAgent: string | null;
    },
) {
    const [feedback] = await db
        .insert(schema.userFeedback)
        .values(values)
        .returning({ id: schema.userFeedback.id, createdAt: schema.userFeedback.createdAt });

    return feedback!;
}
