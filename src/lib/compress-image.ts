// Compressão client-side via Canvas API — reduz resolução/qualidade até
// caber no alvo de tamanho, sempre reencodando pra JPEG. Usada em
// qualquer formulário que envia imagem por Server Action, já que o
// corpo da function tem teto real (~4,5MB na Vercel, ver next.config.ts).
const MAX_DIMENSION = 2000;

export async function compressImage(file: File, targetBytes: number): Promise<File> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  let quality = 0.85;
  let blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

  while (blob && blob.size > targetBytes && quality > 0.3) {
    quality -= 0.15;
    blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  }

  if (!blob) return file;

  const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}
