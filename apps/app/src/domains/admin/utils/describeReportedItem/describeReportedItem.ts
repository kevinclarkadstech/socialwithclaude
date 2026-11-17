import type { ReportedItem } from '@myapp/shared/domains';

/** What a reported thing is called in the queue: "post", "comment", "profile" or "message". */
export function describeReportedItem(item: Pick<ReportedItem, 'kind'>) {
  const nouns = { post: 'post', postComment: 'comment', profile: 'profile', chatMessage: 'message' } as const;
  return { noun: nouns[item.kind] };
}
