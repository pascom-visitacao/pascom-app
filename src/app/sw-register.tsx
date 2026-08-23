"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // updateViaCache: "none" - sem isso, o navegador pode servir um
      // sw.js antigo do cache HTTP no check de atualização (default é
      // "imports", que cacheia o script do worker normalmente).
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch((err) => {
        console.error("Falha ao registrar service worker", err);
      });
    }
  }, []);

  return null;
}
