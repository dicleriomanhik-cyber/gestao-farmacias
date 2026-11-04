import { useEffect, useRef } from "react";

const listeners = new Set<() => void>();

export function notifyDataChanged(): void {
  listeners.forEach((listener) => listener());
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