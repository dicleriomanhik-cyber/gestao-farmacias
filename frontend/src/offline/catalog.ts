import { openDb } from "./db";
import { bootstrapFromServer } from "./bootstrap";

let ultimoRefresh = 0;
let emCurso: Promise<void> | null = null;

function readStore(store: string): Promise<any[]> {
  return openDb().then(
    (db) =>
      new Promise<any[]>((resolve, reject) => {
        const req = db.transaction(store, "readonly").objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result as any[]);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function getCatalogProducts(search = ""): Promise<any[]> {
  const termo = search.trim().toLowerCase();
  const products = await readStore("products");
  return products
    .filter((p) => p.status === "ACTIVE")
    .filter((p) => !termo || String(p.name).toLowerCase().includes(termo))
    .slice(0, 100);
}

export function getCatalogLots(): Promise<any[]> {
  return readStore("stock_lots");
}

export function refreshCatalog(): Promise<void> {
  if (emCurso) return emCurso;
  if (Date.now() - ultimoRefresh < 30000) return Promise.resolve();
  emCurso = bootstrapFromServer()
    .then(() => {
      ultimoRefresh = Date.now();
    })
    .finally(() => {
      emCurso = null;
    });
  return emCurso;
}