// Runs in the browser before an upload. Phone photos are often 3–10MB and
// 4000px+ wide; this scales them down to at most 2000px on the long side and
// re-encodes them as WebP (JPEG where WebP isn't supported). Re-encoding also
// drops the photo's metadata, including any GPS location.
//
// Anything that can't be decoded is returned unchanged, so the normal type and
// size checks still apply to it.

const MAX_SIDE = 2000;
const QUALITY = 0.82;
// Small, already web-sized images are left alone.
const SMALL_ENOUGH = 400 * 1024;

export async function prepareImage(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function" || !file.type.startsWith("image/")) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= SMALL_ENOUGH) return file;
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = (await toBlob(canvas, "image/webp")) ?? (await toBlob(canvas, "image/jpeg"));
    // Keep the original if re-encoding only made a same-sized image bigger.
    if (!blob || (scale === 1 && blob.size >= file.size)) return file;
    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + `.${ext}`, { type: blob.type });
  } finally {
    bitmap.close();
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b && b.type === type ? b : null), type, QUALITY));
}
