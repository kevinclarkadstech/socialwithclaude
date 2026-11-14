import type { CallingUser } from "../../../users/types/calling-user";
import { allow, disallow, type AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { isSignedIn } from "../../../../authorization/conditions/conditions";

/** Anyone signed in can sign out all their other devices (sign-up needn't be finished). */
export const canRevokeOtherSessions: AuthorizationCheck<{ caller: CallingUser | null }, CallingUser> = ({ caller }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    return allow(caller);
};
