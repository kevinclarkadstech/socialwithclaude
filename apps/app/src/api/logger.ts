import type { AppLogger } from '@myapp/shared/observability';

/** The logger the shared queries and mutations get on the client: the browser console. */
export const logger: AppLogger = {
  info: (message, context) => console.info(message, context ?? {}),
  warn: (message, context) => console.warn(message, context ?? {}),
  error: (message, context) => console.error(message, context ?? {}),
  debug: (message, context) => console.debug(message, context ?? {}),
  child: () => logger,
  setBindings: () => {},
};
