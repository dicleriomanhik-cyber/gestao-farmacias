let handler: (() => void) | null = null;

export function registerSyncHandler(fn: () => void): void {
  handler = fn;
}

export function triggerSync(): void {
  if (handler) handler();
}
