import { isEmailHashBanned } from "../../../../data-access";
import { bannedEmailHash } from "../../utils/bannedEmailHash/bannedEmailHash";

/** Whether `email` belonged to someone banned when their account was deleted, so it can't sign up again. */
export async function isEmailBanned({ email }: { email: string }): Promise<boolean> {
    return isEmailHashBanned({ emailHash: bannedEmailHash(email) });
}
