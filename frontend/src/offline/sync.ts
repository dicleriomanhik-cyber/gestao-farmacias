import { getPendingOperations, updateOperation, getClientId } from "./queue";
import { getMeta, setMeta } from "./db";
import { pushOperations, pullChanges } from "../services/syncService";

let syncRunning = false;
let engineStarted = false;

export async function flushOutbox(): Promise<void> {
  if (syncRunning) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  syncRunning = true;
  try {
    const clientId = await getClientId();
    const pending = await getPendingOperations();
    if (pending.length === 0) return;

    for (const op of pending) {
      await updateOperation(op.idempotencyKey, { status: "SYNCING" });
    }

    const results = await pushOperations(clientId, pending);

    for (const r of results) {
      const update: any = { result: r.result };
      if (r.status === "PROCESSED") update.status = "PROCESSED";
      else if (r.status === "REJECTED" || r.status === "CONFLICT") {
        update.status = r.status;
        update.rejectionCode = r.rejectionCode;
        update.rejectionReason = r.rejectionReason;
      } else {
        update.status = "PENDING";
      }
      await updateOperation(r.idempotencyKey, update);
    }
  } catch (err) {
    // Falha de rede: reverter SYNCING para PENDING sem perder operações
    const pending = await getPendingOperations();
    for (const op of pending) {
      if (op.status === "SYNCING") {
        await updateOperation(op.idempotencyKey, { status: "PENDING" });
      }
    }
    throw err;
  } finally {
    syncRunning = false;
  }
}

export async function pullLoop(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const clientId = await getClientId();
  let cursor = await getMeta("syncCursor");
  let hasMore = true;

  while (hasMore) {
    const data = await pullChanges(clientId, cursor);
    if (data.nextCursor) {
      await setMeta("syncCursor", data.nextCursor);
      cursor = data.nextCursor;
    }
    hasMore = !!data.hasMore;
  }
  await setMeta("lastSyncAt", new Date().toISOString());
}

export function startSyncEngine(): void {
  if (engineStarted) return;
  engineStarted = true;

  const run = async () => {
    try {
      await flushOutbox();
      await pullLoop();
    } catch {
      // Silencioso — próximo ciclo tenta novamente
    }
  };

  run();
  setInterval(run, 30_000);

  window.addEventListener("online", () => {
    run();
  });
}
