// Teste isolado de fumaça: sobe um arquivo de teste na pasta "06 —
// Demandas Avulsas" do ano atual, chamando lib/google-drive.ts direto
// (sem passar pela Server Action nem pelo Next.js). Confirma que a
// autenticação institucional + upload funcionam de ponta a ponta antes
// de investir na tela "Enviar fotos".
//
// Uso: node scripts/test-drive-upload.mjs
// Precisa de GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET,
// GOOGLE_DRIVE_REFRESH_TOKEN e GOOGLE_DRIVE_ROOT_FOLDER_ID em .env.local
// (os mesmos valores já configurados na Vercel).

process.loadEnvFile(new URL("../.env.local", import.meta.url));

const required = [
  "GOOGLE_DRIVE_CLIENT_ID",
  "GOOGLE_DRIVE_CLIENT_SECRET",
  "GOOGLE_DRIVE_REFRESH_TOKEN",
  "GOOGLE_DRIVE_ROOT_FOLDER_ID",
];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Faltam em .env.local: ${missing.join(", ")}`);
  console.error("Copia os valores da Vercel (Environment Variables) pra lá antes de rodar.");
  process.exit(1);
}

const { findOrCreateFolderPath, uploadFileToDrive } = await import("../src/lib/google-drive.ts");

const year = String(new Date().getFullYear());
const pathSegments = [year, "06 — Demandas Avulsas"];

console.log("Garantindo pasta:", pathSegments.join("/"));
const folderId = await findOrCreateFolderPath(pathSegments);
console.log("Pasta OK, id:", folderId);

const content = Buffer.from(
  `Teste de upload automatico - PASCOM App\nGerado em: ${new Date().toISOString()}\nPode apagar este arquivo.`,
);

console.log("Enviando arquivo de teste...");
const uploaded = await uploadFileToDrive(folderId, "teste-pascom-app.txt", "text/plain", content);

console.log("\n=========================================================");
console.log("UPLOAD OK");
console.log("=========================================================");
console.log("Nome:", uploaded.name);
console.log("ID:", uploaded.id);
console.log("Link:", uploaded.webViewLink);
console.log("Pasta:", pathSegments.join("/"));
console.log("=========================================================\n");
