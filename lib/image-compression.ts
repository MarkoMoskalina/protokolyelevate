/**
 * Klientská kompresia obrázkov pred uploadom do Supabase Storage.
 *
 * Prečo na klientovi:
 *  - Šetrí mobilné dáta operátora (foto v teréne na 4G).
 *  - Drasticky zníži zaťaženie Supabase Storage (origináli z mobilu majú 4-12 MB,
 *    po kompresii ~200-500 KB, ~10-20× úspora).
 *  - Z fotiek sa pri re-encode automaticky odstráni EXIF GPS (GDPR požiadavka).
 *  - Web Worker zabraňuje zaseknutiu UI počas kompresie.
 */

import imageCompression from "browser-image-compression";

export type CompressionPreset = "photo" | "document" | "signature";

/**
 * Presety odvodené od typu obsahu.
 *
 * `photo`    - bežné fotky stavu auta / palivomer / km / poškodenia.
 *              2000 px stačí na detail škrabanca aj čitateľný palivomer.
 * `document` - občiansky preukaz, vodičský preukaz - vyššie rozlíšenie a kvalita,
 *              aby zostali čitateľné drobné údaje (ŠPZ, číslo dokladu).
 * `signature`- digitálny podpis (canvas PNG s alpha kanálom). JPEG by ho rozsekal,
 *              preto kompresiu obchádzame úplne.
 */
const PRESETS: Record<
  Exclude<CompressionPreset, "signature">,
  {
    maxSizeMB: number;
    maxWidthOrHeight: number;
    initialQuality: number;
    fileType: "image/jpeg";
  }
> = {
  photo: {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 2000,
    initialQuality: 0.82,
    fileType: "image/jpeg",
  },
  document: {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 2400,
    initialQuality: 0.85,
    fileType: "image/jpeg",
  },
};

/**
 * Súbory pod touto veľkosťou A zároveň pod cieľovým rozmerom preskočíme
 * (kompresia by ich mohla iba minimálne zlepšiť, alebo dokonca zväčšiť).
 */
const SKIP_IF_SMALLER_THAN_BYTES = 200 * 1024;

const HEIC_MIME = ["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"];
const HEIC_EXT_REGEX = /\.(heic|heif)$/i;

function isHeic(file: File): boolean {
  return HEIC_MIME.includes(file.type.toLowerCase()) || HEIC_EXT_REGEX.test(file.name);
}

/**
 * Pre-flight check: bežia HEIC dekodéry v tomto prehliadači?
 * Safari (iOS / macOS) áno, Chrome / Firefox nie.
 * Skontrolujeme cez canvas - ak nedokáže obrázok dekódovať, vyhodíme zrozumiteľnú chybu.
 */
async function canDecodeImage(file: File): Promise<boolean> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth > 0 && img.naturalHeight > 0);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface CompressOptions {
  preset?: CompressionPreset;
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
}

/**
 * Skomprimuje obrázok podľa zvoleného presetu.
 *
 * Vstup je vždy `File`, výstup tiež `File` (knižnica zachová `.name` a doplní extenzii
 * podľa výsledného mime). Nie-obrázkové súbory a podpisy vraciame nezmenené.
 *
 * Throws:
 *  - HEIC v non-Safari prehliadači (`HEIC nie je podporovaný...`)
 *  - Abort cez `signal` (`AbortError`)
 *  - Akúkoľvek chybu z knižnice (poškodený súbor, atď.)
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const { preset = "photo", signal, onProgress } = options;

  // Podpisy: PNG s priehľadnosťou, kompresiu cez JPEG by zničila tenké čiary.
  // Plus signature z canvasu je už malý (zvyčajne < 30 KB).
  if (preset === "signature") return file;

  // Iné než obrázky (nemalo by sa stať, ale buďme defenzívni).
  if (!file.type.startsWith("image/") && !isHeic(file)) return file;

  if (isHeic(file)) {
    const decodable = await canDecodeImage(file);
    if (!decodable) {
      throw new Error(
        "HEIC formát nie je podporovaný v tomto prehliadači. " +
          "V nastaveniach iPhonu prepnite Fotoaparát → Formáty → Najkompatibilnejšie, " +
          "alebo použite iný prehliadač.",
      );
    }
  }

  const presetConfig = PRESETS[preset];

  // Skip pre už malé JPEG/WebP súbory - žiadna výrazná úspora, len plytvanie CPU.
  // Podľa toho, čo už máme: ak je < 200 KB a pravdepodobne pod max rozmerom, necháme tak.
  if (
    file.size < SKIP_IF_SMALLER_THAN_BYTES &&
    (file.type === "image/jpeg" || file.type === "image/webp")
  ) {
    return file;
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: presetConfig.maxSizeMB,
    maxWidthOrHeight: presetConfig.maxWidthOrHeight,
    initialQuality: presetConfig.initialQuality,
    fileType: presetConfig.fileType,
    useWebWorker: true,
    // preserveExif: false → odstráni GPS súradnice a metadáta.
    // EXIF orientation je aplikovaná na pixely, takže rotácia zostane správna.
    preserveExif: false,
    signal,
    onProgress,
  });

  // Ochrana pre prípad, keď kompresia paradoxne zväčšila súbor (môže sa stať pri
  // už dobre skomprimovaných JPEG s vysokou kvalitou). Vrátime menší z dvojice.
  if (compressed.size >= file.size) {
    return file;
  }

  return compressed;
}

/**
 * Heuristika: odhadne preset z cesty / folderu.
 * Folder z `lib/upload.ts` je vo formáte `protocols/<id>/<kind>`.
 */
export function presetFromFolder(folder: string): CompressionPreset {
  const lower = folder.toLowerCase();
  if (lower.includes("signature")) return "signature";
  if (lower.includes("id-card") || lower.includes("driver-license")) return "document";
  return "photo";
}
