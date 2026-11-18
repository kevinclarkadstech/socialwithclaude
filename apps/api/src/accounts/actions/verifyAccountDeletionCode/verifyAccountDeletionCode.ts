import { consumeAccountDeletionCode } from "../../../data-access";
import { hashCode } from "../../utils/hashCode/hashCode";

/** Whether `code` is someone's current account deletion code (see consumeAccountDeletionCode for attempts). */
export async function verifyAccountDeletionCode({ userId, code }: { userId: string; code: string }): Promise<boolean> {
    return consumeAccountDeletionCode({ userId, codeHash: hashCode(code) });
}
