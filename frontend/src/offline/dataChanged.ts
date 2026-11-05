import { useEffect, useRef } from "react";

const listeners = new Set<() => void>();
let scheduled = false;
const channel: BroadcastChannel | null = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("farmacia-data-changed") : null;

function fire(): void {
  listeners.forEach((listener) => listener());
}

if (channel) channel.onmessage = () => fire();

export function notifyDataChanged(): void {
  if (!scheduled) {
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      fire();
    }, 0);
  }
  if (channel) channel.postMessage(1);
}

export function useDataChanged(callback: () => void): void {
  const ref = useRef(callback);
  ref.current = callback;
  useEffect(() => {
    const fn = () => ref.current();
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
}

export function subscribeDataChanged(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
