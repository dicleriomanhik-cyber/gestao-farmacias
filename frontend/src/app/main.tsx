import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "../styles/globals.css";
import { startUpdateWatcher } from "./updater";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// PWA: registo do service worker e pedido de armazenamento persistente
// (evita que o navegador apague a fila offline quando faltar espaço)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => undefined);
}

startUpdateWatcher();
