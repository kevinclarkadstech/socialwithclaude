import z from "zod";
import { Query } from "../../../types/query";
import { succeed } from "../../../types/result";

export const GetFeedQueryInputSchema = z.object({
    sortBy: z.string().optional(),
});

export type GetFeedQueryInput = z.infer<typeof GetFeedQueryInputSchema>;

export const GetFeedQueryOutputSchema = z.object({

});

export type GetFeedQueryOutput = z.infer<typeof GetFeedQueryOutputSchema>;

export const getFeedQuery: Query<{ input: GetFeedQueryInput, output: GetFeedQueryOutput }> = async () => {

    return succeed({});
}