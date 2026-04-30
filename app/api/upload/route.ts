import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Whitelist MIME typov, ktoré akceptujeme.
 *
 * - image/jpeg + image/webp + image/png  → výstupy z klientskej kompresie a podpisy.
 * - image/heic / image/heif              → fallback z iOS Safari (klientská kompresia
 *                                          ich tam vie skomprimovať, ale ak by zlyhala
 *                                          a poslalo sa to v origináli, nech aspoň prejde).
 *
 * GIF, SVG, BMP a iné odmietame - SVG je XSS riziko, GIF/BMP sú zbytočne veľké.
 */
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

/**
 * Hard limit po klientskej kompresii. Bežné fotky majú < 1 MB, dokumenty < 1 MB.
 * 5 MB je dostatočný buffer pre prípady, keď kompresia z nejakého dôvodu zlyhala
 * a klient poslal originál (napr. HEIC z iOS, ktorý sa nedal lokálne dekódovať).
 */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || "protocol-photos";
    const folder = (formData.get("folder") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Súbor je príliš veľký (max 5 MB po kompresii)" },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: `Nepodporovaný formát súboru: ${file.type || "neznámy"}` },
        { status: 400 },
      );
    }

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${folder}/${crypto.randomUUID()}.${ext}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filename, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ path: data.path, fullPath: data.fullPath });
  } catch {
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 },
    );
  }
}
