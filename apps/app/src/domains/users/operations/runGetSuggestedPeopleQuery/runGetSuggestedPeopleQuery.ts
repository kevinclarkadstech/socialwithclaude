import { getSuggestedPeopleQuery } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../callingUserStore';

/** A few people to follow (see getSuggestedPeopleQuery). */
export function runGetSuggestedPeopleQuery() {
  return getSuggestedPeopleQuery({
    input: { limit: 5 },
    context: { logger },
    dependencies: {
      getCallingUser,
      getSuggestedPeople: ({ limit }) => fromApi(api.users.getSuggestedPeople.query({ limit })),
    },
  });
}
