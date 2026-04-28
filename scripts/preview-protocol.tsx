/**
 * Preview the protocol PDF and email locally.
 *
 * Usage:
 *   pnpm dlx tsx scripts/preview-protocol.tsx
 *
 * Outputs:
 *   tmp/preview-handover.pdf
 *   tmp/preview-handover.html
 *   tmp/preview-return.pdf
 *   tmp/preview-return.html
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { renderToBuffer } from "@react-pdf/renderer";

import { ProtocolPdf, type CompanyInfo } from "../components/pdf/protocol-pdf";
import { buildProtocolEmail } from "../lib/email-templates";
import type { Protocol } from "../lib/protocols";

const company: CompanyInfo = {
  email: "info@elevatecars.sk",
  phone: "+421948666696",
};

const baseProtocol: Protocol = {
  id: "a1517f2d-cb61-45fb-97cc-e8399994b4fc",
  reservation_id: "00000000-0000-0000-0000-000000000001",
  car_id: "00000000-0000-0000-0000-000000000002",
  type: "handover",
  handover_protocol_id: null,
  customer_first_name: "Ján",
  customer_last_name: "Novák",
  customer_email: "jan.novak@example.com",
  customer_phone: "+421 905 123 456",
  customer_id_card_front_url: null,
  customer_id_card_back_url: null,
  customer_driver_license_url: null,
  car_name: "BMW 320d xDrive",
  car_license_plate: "BA-123-AB",
  reservation_number: "R-2026-0428",
  protocol_datetime: "2026-04-28T14:00:00Z",
  expected_return_datetime: "2026-04-30T10:00:00Z",
  location: "Bratislava — letisko M.R. Štefánika",
  mileage_km: 45230,
  mileage_photo_url: null,
  fuel_level: "4/4",
  fuel_photo_url: null,
  allowed_km: 1500,
  km_exceeded: null,
  km_exceeded_price: null,
  extra_km_rate: null,
  deposit_amount: 500,
  deposit_method: "card_hold",
  car_photos: [],
  damages: [
    {
      description: "Drobný škrabanec na ľavých predných dverách (~3 cm)",
      photo_urls: ["dummy1", "dummy2"],
    },
    {
      description: "Mierne odretý plast nárazníka vpredu vpravo",
      photo_urls: ["dummy3"],
    },
  ],
  signature_landlord_url: null,
  signature_tenant_url: null,
  internal_notes: "Zákazník platil kartou, depozit blokovaný.",
  pdf_url: null,
  access_code: "739204",
  created_by: null,
  created_at: "2026-04-28T13:55:00Z",
  updated_at: "2026-04-28T13:55:00Z",
  status: "completed",
};

const returnProtocol: Protocol = {
  ...baseProtocol,
  id: "b2628f3e-dc72-56fc-08dd-f9499aa5c5fd",
  type: "return",
  handover_protocol_id: baseProtocol.id,
  protocol_datetime: "2026-04-30T11:30:00Z",
  expected_return_datetime: null,
  mileage_km: 47100,
  km_exceeded: 370,
  extra_km_rate: 0.3,
  km_exceeded_price: 111,
  deposit_amount: null,
  deposit_method: null,
  damages: [
    {
      description: "Nový škrabanec na zadnom nárazníku (~5 cm)",
      photo_urls: ["dummy4"],
    },
  ],
  internal_notes: null,
  access_code: "184562",
};

// 1x1 transparent PNG as a placeholder signature
const PLACEHOLDER_SIGNATURE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

async function main() {
  const outDir = path.resolve(process.cwd(), "tmp");
  await mkdir(outDir, { recursive: true });

  console.log("Generating handover PDF...");
  const handoverPdf = await renderToBuffer(
    <ProtocolPdf
      protocol={baseProtocol}
      company={company}
      appUrl="https://protokoly.elevatecars.sk"
      signatureLandlordDataUrl={PLACEHOLDER_SIGNATURE}
      signatureTenantDataUrl={PLACEHOLDER_SIGNATURE}
    />,
  );
  await writeFile(path.join(outDir, "preview-handover.pdf"), handoverPdf);

  console.log("Generating return PDF...");
  const returnPdf = await renderToBuffer(
    <ProtocolPdf
      protocol={returnProtocol}
      company={company}
      appUrl="https://protokoly.elevatecars.sk"
      signatureLandlordDataUrl={PLACEHOLDER_SIGNATURE}
      signatureTenantDataUrl={PLACEHOLDER_SIGNATURE}
    />,
  );
  await writeFile(path.join(outDir, "preview-return.pdf"), returnPdf);

  console.log("Generating handover email...");
  const handoverEmail = buildProtocolEmail({
    protocol: baseProtocol,
    appUrl: "https://protokoly.elevatecars.sk",
    contactEmail: company.email,
    contactPhone: company.phone,
  });
  await writeFile(
    path.join(outDir, "preview-handover.html"),
    handoverEmail.html,
  );

  console.log("Generating return email...");
  const returnEmail = buildProtocolEmail({
    protocol: returnProtocol,
    appUrl: "https://protokoly.elevatecars.sk",
    contactEmail: company.email,
    contactPhone: company.phone,
  });
  await writeFile(path.join(outDir, "preview-return.html"), returnEmail.html);

  console.log("\nDone! Files written to:", outDir);
  console.log("  - preview-handover.pdf");
  console.log("  - preview-handover.html");
  console.log("  - preview-return.pdf");
  console.log("  - preview-return.html");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
