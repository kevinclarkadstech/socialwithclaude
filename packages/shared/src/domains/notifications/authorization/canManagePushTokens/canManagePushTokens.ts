import type { CallingUser } from "../../../users/types/calling-user";
import { allow, disallow, type AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { isSignedIn } from "../../../../authorization/conditions/conditions";

/** Anyone signed in can turn push notifications on or off for the device they're on. */
export const canManagePushTokens: AuthorizationCheck<{ caller: CallingUser | null }, CallingUser> = ({ caller }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    return allow(caller);
};
