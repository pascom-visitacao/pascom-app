// Service worker minimo, so o suficiente pra tornar o app instalavel
// como PWA. Sem cache offline sofisticado de proposito - o app depende
// de dados em tempo real (Supabase) de qualquer forma, entao cachear
// respostas antigas causaria mais confusao do que ajuda.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Listener vazio (sem respondWith) = deixa o navegador buscar da rede
// normalmente. Só precisa existir pra contar como instalável.
self.addEventListener("fetch", () => {});
