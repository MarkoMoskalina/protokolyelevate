import {
  compressImage,
  presetFromFolder,
  type CompressionPreset,
} from "@/lib/image-compression";

interface UploadFileOptions {
  /** Override pre auto-detekciu z folderu (napr. force "document" pre OCR-ready scan). */
  preset?: CompressionPreset;
  /** Cancel rozbehnutej kompresie/uploadu. */
  signal?: AbortSignal;
  /** 0-100, len pre fázu kompresie (samotný HTTP upload progres neriešime). */
  onCompressProgress?: (percent: number) => void;
}

export async function uploadFile(
  file: File,
  folder: string,
  bucket = "protocol-photos",
  options: UploadFileOptions = {},
): Promise<string> {
  const preset = options.preset ?? presetFromFolder(folder);

  // Klientská kompresia - vstupný súbor sa môže scvrknúť 10-20×.
  // Ak kompresia zlyhá (poškodený súbor, HEIC v Chrome, …), bublime chybu hore.
  const prepared = await compressImage(file, {
    preset,
    signal: options.signal,
    onProgress: options.onCompressProgress,
  });

  const formData = new FormData();
  formData.append("file", prepared);
  formData.append("bucket", bucket);
  formData.append("folder", folder);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
    signal: options.signal,
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Upload failed");
  }

  const { path } = await res.json();
  return path;
}

export async function uploadSignature(
  dataUrl: string,
  folder: string,
): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], "signature.png", { type: "image/png" });
  // Podpis je už úzky PNG z canvasu - vynútime preset "signature" (skip kompresie).
  return uploadFile(file, folder, "protocol-photos", { preset: "signature" });
}
