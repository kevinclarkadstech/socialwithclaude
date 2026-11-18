import type { CallingUser } from "../../../users/types/calling-user";
import { allow, disallow, type AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { isSignedIn } from "../../../../authorization/conditions/conditions";

/**
 * Anyone signed in can delete their account, or restore one scheduled for
 * deletion (sign-up needn't be finished).
 */
export const canManageAccount: AuthorizationCheck<{ caller: CallingUser | null }, CallingUser> = ({ caller }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    return allow(caller);
};
