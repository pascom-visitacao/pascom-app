// Cliente server-only pro Google Drive, autenticado pela conta institucional
// (pascomvisitacao@gmail.com) via refresh token de longa duração — não é
// login por usuário. Ver scripts/drive-oauth-setup/ pra como esse refresh
// token foi gerado (escopo drive.file + Picker, pasta raiz PASCOM
// selecionada manualmente uma única vez).
//
// Nunca importar isso em código que roda no navegador.

import { getGoogleAccessToken } from "./google-oauth";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";

async function driveFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const accessToken = await getGoogleAccessToken();
  const res = await fetch(`${DRIVE_API}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Drive API error (${path}): ${await res.text()}`);
  }

  return res;
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function findChildFolder(parentId: string, name: string): Promise<string | null> {
  const q = [
    `'${parentId}' in parents`,
    `name = '${escapeDriveQueryValue(name)}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    `trashed = false`,
  ].join(" and ");

  const res = await driveFetch(`/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`);
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

async function createFolder(parentId: string, name: string): Promise<string> {
  const res = await driveFetch("/files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  const data = await res.json();
  return data.id;
}

async function findOrCreateFolder(parentId: string, name: string): Promise<string> {
  const existing = await findChildFolder(parentId, name);
  if (existing) return existing;
  return createFolder(parentId, name);
}

/**
 * Garante que o caminho de pastas existe (cria as que faltarem), a partir
 * da raiz PASCOM (GOOGLE_DRIVE_ROOT_FOLDER_ID). Retorna o id da última
 * pasta do caminho. Segue o princípio do doc de organização: só cria
 * pasta quando necessário, nunca antecipadamente.
 */
export async function findOrCreateFolderPath(pathSegments: string[]): Promise<string> {
  let currentFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;

  for (const segment of pathSegments) {
    currentFolderId = await findOrCreateFolder(currentFolderId, segment);
  }

  return currentFolderId;
}

export type UploadedDriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
};

/**
 * Envia um arquivo pro Drive dentro da pasta indicada. Usa upload
 * multipart simples (metadata + conteúdo numa request só) — adequado
 * pro tamanho de arquivo tratado no app (fotos/documentos, não vídeos
 * gigantes que precisariam de upload resumível).
 */
export async function uploadFileToDrive(
  folderId: string,
  filename: string,
  mimeType: string,
  content: Buffer,
): Promise<UploadedDriveFile> {
  const accessToken = await getGoogleAccessToken();

  const boundary = `pascom-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ name: filename, parents: [folderId] });

  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    ),
    content,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch(`${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id,name,mimeType,webViewLink`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Falha no upload pro Drive: ${await res.text()}`);
  }

  return res.json();
}
