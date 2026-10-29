import { type AppError } from '@myapp/shared/error-handling'
import { TRPCError, type TRPC_ERROR_CODE_KEY, } from '@trpc/server';
import { trpcServer } from "@hono/trpc-server";
import { rootLogger } from '../observability';

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
    }

    return new AppTrpcError({
        code: "BAD_GATEWAY"
    }, appError.metadata)
}

type OnErrorFn = Parameters<typeof trpcServer>['0']['onError'];

export const trpcOnErrorFunction: OnErrorFn = ({ error, path, ctx }) => {
    console.log('onError trpc')
    if (error.code !== "INTERNAL_SERVER_ERROR") return;
    (ctx?.logger ?? rootLogger).error(error.message, { err: error, path });
    return {
        hello: 'world'
    }
}