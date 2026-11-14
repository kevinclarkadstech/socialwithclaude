import { type AppError } from '@myapp/shared/error-handling'
import { TRPCError, type TRPC_ERROR_CODE_KEY, } from '@trpc/server';
import { trpcServer } from "@hono/trpc-server";
import { getContext } from 'hono/context-storage';
import { errorReporter, rootLogger } from '../observability';
import type { AppHonoEnv } from '../index';

export class AppTrpcError extends TRPCError {
    public metadata?: Record<string, unknown>;
    public constructor(input: ConstructorParameters<typeof TRPCError>['0'], metadata?: Record<string, unknown>) {
        super(input);
        this.metadata = metadata;
    }
}

export function appErrorToTrpcError(appError: AppError): AppTrpcError {
    let code: TRPC_ERROR_CODE_KEY = "INTERNAL_SERVER_ERROR";
    let metadata: Record<string, unknown> | undefined;
    switch (appError.type) {
        case 'authentication': {
            code = "UNAUTHORIZED";
            break;
        }
        case 'authorization': {
            code = "FORBIDDEN";
            break;
        }
        case "validation": {
            code = "BAD_REQUEST";
            metadata = appError.metadata;
            break;
        }
        case "not-found": {
            code = "NOT_FOUND";
            break;
        }
        case "conflict": {
            code = "CONFLICT";
            break;
        }
        case "unexpected": {
            code = "INTERNAL_SERVER_ERROR";
            break;
        }
    }

    return new AppTrpcError({
        code,
        message: appError.message,
    }, metadata)
}

type OnErrorFn = Parameters<typeof trpcServer>['0']['onError'];

/** Logs and reports unexpected errors with their full details; the client only sees a generic message. */
export const trpcOnErrorFunction: OnErrorFn = ({ error, path, ctx }) => {
    if (error.code !== "INTERNAL_SERVER_ERROR") {
        return;
    }
    const cause = error.cause ?? error;
    (ctx?.logger ?? rootLogger).error(error.message, { err: cause, path });
    const c = getContext<AppHonoEnv>();
    errorReporter.report({
        error: cause,
        context: { requestId: c.get("requestId"), userId: c.get("user")?.id, method: c.req.method, path: c.req.path, procedure: path },
    });
}