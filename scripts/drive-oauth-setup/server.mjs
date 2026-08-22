// Script local, de uso unico: autoriza a conta institucional do Google
// Drive (escopo drive.file) e usa o Picker pra selecionar a pasta raiz
// "PASCOM", produzindo o refresh token + demais credenciais que a rota
// server-side de upload vai usar. Nada disso passa pelo chat - roda no
// seu terminal, os valores finais aparecem so no console local.
//
// Uso: node scripts/drive-oauth-setup/server.mjs
// (antes, copia .env.drive-setup.example pra .env.drive-setup e preenche)

import http from "node:http";
import { randomBytes } from "node:crypto";

try {
  process.loadEnvFile(new URL("./.env.drive-setup", import.meta.url));
} catch {
  console.error(
    "Nao achei scripts/drive-oauth-setup/.env.drive-setup - copia o .env.drive-setup.example e preenche antes de rodar.",
  );
  process.exit(1);
}

const PORT = 8734;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const PICKER_API_KEY = process.env.GOOGLE_PICKER_API_KEY;

if (!CLIENT_ID || !CLIENT_SECRET || !PICKER_API_KEY) {
  console.error(
    "Faltam variaveis em .env.drive-setup (GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_PICKER_API_KEY).",
  );
  process.exit(1);
}

const state = randomBytes(16).toString("hex");
let accessToken = null;
let refreshToken = null;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/") {
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/drive.file");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!doctype html>
<html><body style="font-family: sans-serif; padding: 40px;">
  <h1>Setup Google Drive — PASCOM</h1>
  <p>Faça login com a conta institucional (<code>pascomvisitacao@gmail.com</code>) e autorize o acesso.</p>
  <a href="${authUrl.toString()}" style="display:inline-block;padding:12px 20px;background:#1a73e8;color:white;text-decoration:none;border-radius:6px;">
    Autorizar com o Google
  </a>
</body></html>`);
    return;
  }

  if (url.pathname === "/oauth2callback") {
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");

    if (!code || returnedState !== state) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Erro: código ausente ou state inválido.");
      return;
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error("Erro trocando o código por token:", tokenData);
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Erro trocando o código por token — vê o terminal.");
      return;
    }

    accessToken = tokenData.access_token;
    refreshToken = tokenData.refresh_token;

    if (!refreshToken) {
      console.error(
        "\nGoogle não retornou refresh_token — provavelmente essa conta já autorizou esse app antes.",
      );
      console.error(
        "Vai em https://myaccount.google.com/permissions, remove o acesso do app 'PASCOM App' e tenta de novo.\n",
      );
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Não veio refresh_token — vê as instruções no terminal.");
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!doctype html>
<html><body style="font-family: sans-serif; padding: 40px;">
  <h1>Passo 2: selecione a pasta PASCOM</h1>
  <p>Escolha a pasta raiz "PASCOM" no seletor abaixo.</p>
  <div id="picker-btn" style="display:inline-block;padding:12px 20px;background:#1a73e8;color:white;border-radius:6px;cursor:pointer;">
    Abrir seletor de pastas
  </div>
  <p id="status"></p>
  <script src="https://apis.google.com/js/api.js"></script>
  <script>
    const accessToken = ${JSON.stringify(accessToken)};
    const apiKey = ${JSON.stringify(PICKER_API_KEY)};

    function onApiLoad() {
      gapi.load('picker', createPicker);
    }

    function createPicker() {
      document.getElementById('picker-btn').onclick = () => {
        const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
          .setSelectFolderEnabled(true)
          .setIncludeFolders(true);
        const picker = new google.picker.PickerBuilder()
          .addView(view)
          .setOAuthToken(accessToken)
          .setDeveloperKey(apiKey)
          .setCallback(pickerCallback)
          .build();
        picker.setVisible(true);
      };
    }

    function pickerCallback(data) {
      if (data.action === google.picker.Action.PICKED) {
        const folder = data.docs[0];
        document.getElementById('status').innerText = 'Selecionado: ' + folder.name + ' — enviando...';
        fetch('/picker-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: folder.id, name: folder.name }),
        }).then(() => {
          document.getElementById('status').innerText = 'Pronto! Pode fechar essa aba e voltar pro terminal.';
        });
      }
    }

    onApiLoad();
  </script>
</body></html>`);
    return;
  }

  if (url.pathname === "/picker-result" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    const { id, name } = JSON.parse(body);

    console.log("\n\n=========================================================");
    console.log("SETUP CONCLUÍDO");
    console.log("=========================================================");
    console.log("Pasta selecionada:", name, "(id:", id + ")");
    console.log("");
    console.log("Cola os valores abaixo nas Environment Variables da Vercel");
    console.log("(cada um numa entrada separada, Key = nome antes do '='):");
    console.log("");
    console.log("GOOGLE_DRIVE_REFRESH_TOKEN=" + refreshToken);
    console.log("GOOGLE_DRIVE_CLIENT_ID=" + CLIENT_ID);
    console.log("GOOGLE_DRIVE_CLIENT_SECRET=" + CLIENT_SECRET);
    console.log("GOOGLE_DRIVE_ROOT_FOLDER_ID=" + id);
    console.log("=========================================================\n");

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));

    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 500);
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Abre http://localhost:${PORT} no navegador pra começar.`);
});
