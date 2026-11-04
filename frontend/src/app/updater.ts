import { getPendingOperations } from "../offline/queue";

const INTERVALO_MS = 60 * 1000;

function bundleAtual(): string | null {
  const s = document.querySelector('script[type="module"][src*="/assets/"]') as HTMLScriptElement | null;
  return s ? new URL(s.src).pathname : null;
}

async function bundleNovo(): Promise<string | null> {
  const resp = await fetch("/index.html?v=" + Date.now(), { cache: "no-store" });
  if (!resp.ok) return null;
  const html = await resp.text();
  const m = /<script[^>]*type="module"[^>]*src="([^"]*\/assets\/[^"]+\.js)"/.exec(html);
  if (!m) return null;
  const novo = new URL(m[1], location.origin).pathname;
  if (novo === bundleAtual()) return novo;
  const extras: string[] = [];
  const rx = /(?:href|src)="([^"]*\/assets\/[^"]+\.(?:js|css))"/g;
  let mm: RegExpExecArray | null;
  while ((mm = rx.exec(html))) extras.push(new URL(mm[1], location.origin).pathname);
  const todos = [novo].concat(extras.filter((x) => x !== novo));
  for (const p of todos) {
    const r = await fetch(p, { cache: "reload" });
    if (!r.ok) return null;
  }
  return novo;
}

// Deteta uma versao nova e aplica-a so quando muda de pagina e a fila esta vazia.
export function startUpdateWatcher(): void {
  if (!import.meta.env.PROD) return;
  const atual = bundleAtual();
  if (!atual) return;
  let pronta = false;
  let verificando = false;
  let ultimoCaminho = location.pathname;
  let ultimaAcao = 0;

  async function verificar(): Promise<void> {
    if (pronta || verificando || !navigator.onLine) return;
    verificando = true;
    try {
      const novo = await bundleNovo();
      if (novo && novo !== atual) {
        pronta = true;
        if (Date.now() - ultimaAcao > 20000) void aplicar();
      }
    } catch {
      /* sem ligacao: tenta mais tarde */
    } finally {
      verificando = false;
    }
  }

  async function aplicar(): Promise<void> {
    if (!pronta || !navigator.onLine) return;
    try {
      if ((await getPendingOperations()).length > 0) return;
    } catch {
      return;
    }
    location.reload();
  }

  void verificar();
  setInterval(() => void verificar(), INTERVALO_MS);
  window.addEventListener("online", () => void verificar());
  window.addEventListener("focus", () => void verificar());
  ["pointerdown", "keydown", "input"].forEach((ev) => window.addEventListener(ev, () => { ultimaAcao = Date.now(); }, true));
  setInterval(() => {
    if (pronta && Date.now() - ultimaAcao > 20000) void aplicar();
  }, 5000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void verificar();
  });
  setInterval(() => {
    if (location.pathname !== ultimoCaminho) {
      ultimoCaminho = location.pathname;
      void aplicar();
    }
  }, 1500);
}