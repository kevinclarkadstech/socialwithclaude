import { db } from "@/server/data-access";
import { createAuthInstance } from "./index";

// The `@better-auth/cli` statically resolves an exported `auth` instance and
// never calls a factory function, so this concrete export exists solely for
// `--config` to point at when running `generate`/`migrate`.
export const auth = createAuthInstance(db);
