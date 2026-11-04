import { getPendingOperations } from "../offline/queue";

const INTERVALO_MS = 10 * 60 * 1000;

function bundleAtual(): string | null {
  const s = document.querySelector('script[type="module"][src*="/assets/"]') as HTMLScriptElement | null;
  return s ? new URL(s.src).pathname : null;
}

async function bundleNovo(): Promise<string | null> {
  const resp = await fetch("/index.html", { cache: "no-store" });
  if (!resp.ok) return null;
  const html = await resp.text();
  const m = /<script[^>]*type="module"[^>]*src="([^"]*\/assets\/[^"]+\.js)"/.exec(html);
  return m ? new URL(m[1], location.origin).pathname : null;
}

// Deteta uma versao nova e aplica-a so quando muda de pagina e a fila esta vazia.
export function startUpdateWatcher(): void {
  if (!import.meta.env.PROD) return;
  const atual = bundleAtual();
  if (!atual) return;
  let pronta = false;
  let verificando = false;
  let ultimoCaminho = location.pathname;

  async function verificar(): Promise<void> {
    if (pronta || verificando || !navigator.onLine) return;
    verificando = true;
    try {
      const novo = await bundleNovo();
      if (novo && novo !== atual) pronta = true;
    } catch {
      /* sem ligacao: tenta mais tarde */
    } finally {
      verificando = false;
    }
  }

  async function aplicar(): Promise<void> {
    if (!pronta) return;
    try {
      if ((await getPendingOperations()).length > 0) return;
    } catch {
      return;
    }
    location.reload();
  }

  setTimeout(() => void verificar(), 20000);
  setInterval(() => void verificar(), INTERVALO_MS);
  window.addEventListener("online", () => void verificar());
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