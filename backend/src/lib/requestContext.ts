import { AsyncLocalStorage } from 'node:async_hooks';

type RequestContext = { userId: string };

// Carries the authenticated user through async calls so upstream credits can be charged to them
// without threading a userId through every market-data function. Empty outside requests (cron alerts).
const storage = new AsyncLocalStorage<RequestContext>();

export function runWithUser<T>(userId: string, fn: () => T): T {
  return storage.run({ userId }, fn);
}

export function currentUserId(): string | undefined {
  return storage.getStore()?.userId;
}
