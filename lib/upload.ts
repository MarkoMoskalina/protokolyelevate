export async function uploadFile(
  file: File,
  folder: string,
  bucket = "protocol-photos",
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", bucket);
  formData.append("folder", folder);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
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
  return uploadFile(file, folder);
}
