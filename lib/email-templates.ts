import type { Protocol } from "@/lib/protocols";

const BRAND = "Elevate Cars";
const BRAND_URL = "elevatecars.sk";

interface ProtocolEmailParams {
  protocol: Protocol;
  appUrl: string;
  contactEmail?: string;
  contactPhone?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildProtocolEmail({
  protocol,
  appUrl,
  contactEmail,
  contactPhone,
}: ProtocolEmailParams): { subject: string; html: string; text: string } {
  const isReturn = protocol.type === "return";
  const title = isReturn ? "Preberací protokol" : "Odovzdávací protokol";
  const subject = `${title} | ${BRAND}`;

  const customerName = `${protocol.customer_first_name} ${protocol.customer_last_name}`.trim();
  const car = `${protocol.car_name} (${protocol.car_license_plate})`;
  const date = formatDateTime(protocol.protocol_datetime);
  const code = protocol.access_code;
  // Personal link with the secret token. The 6-digit code is also pre-filled
  // via ?kod= so the user only needs one click.
  const protocolUrl = `${appUrl}/zobrazenie/${protocol.access_token}`;
  const oneClickUrl = `${protocolUrl}?kod=${encodeURIComponent(code)}`;
  const validUntil = protocol.access_expires_at
    ? new Date(protocol.access_expires_at).toLocaleDateString("sk-SK", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const text = [
    `Dobrý deň ${customerName},`,
    "",
    `posielame Vám ${title.toLowerCase()} k vozidlu ${car}.`,
    `Dátum: ${date}`,
    "",
    "Protokol nájdete v prílohe tohto emailu.",
    "",
    "Pre zobrazenie kompletnej fotodokumentácie kliknite na link:",
    oneClickUrl,
    "",
    `Alebo otvorte ${protocolUrl} a zadajte kód: ${code}`,
    "",
    validUntil ? `Link platí do ${validUntil}.` : "",
    "",
    "S pozdravom,",
    `Tím ${BRAND}`,
    contactEmail ? `Email: ${contactEmail}` : "",
    contactPhone ? `Tel: ${contactPhone}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #e2e8f0;">
              <div style="font-size:18px;font-weight:700;color:#2563eb;">${BRAND}</div>
              <div style="font-size:13px;color:#475569;margin-top:4px;">${escapeHtml(title)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 12px;font-size:15px;">Dobrý deň <strong>${escapeHtml(customerName)}</strong>,</p>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
                posielame Vám ${escapeHtml(title.toLowerCase())} k vozidlu
                <strong>${escapeHtml(car)}</strong>.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:0 0 20px;">
                <tr>
                  <td style="padding:14px 18px;font-size:13px;color:#475569;">
                    <div><strong style="color:#0f172a;">Vozidlo:</strong> ${escapeHtml(car)}</div>
                    <div style="margin-top:4px;"><strong style="color:#0f172a;">Dátum:</strong> ${escapeHtml(date)}</div>
                    ${
                      protocol.reservation_number
                        ? `<div style="margin-top:4px;"><strong style="color:#0f172a;">Rezervácia:</strong> ${escapeHtml(protocol.reservation_number)}</div>`
                        : ""
                    }
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
                Protokol nájdete v <strong>prílohe</strong> tohto emailu (PDF).
              </p>

              <div style="margin:24px 0;padding:18px;border:1px solid #e2e8f0;border-left:3px solid #2563eb;border-radius:8px;background:#f8fafc;">
                <div style="font-size:13px;font-weight:700;margin-bottom:10px;">Fotodokumentácia online</div>
                <div style="margin:0 0 14px;">
                  <a href="${escapeHtml(oneClickUrl)}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;border-radius:6px;">
                    Otvoriť protokol &rarr;
                  </a>
                </div>
                <div style="font-size:12px;color:#64748b;line-height:1.6;">
                  Alebo manuálne otvorte <a href="${escapeHtml(protocolUrl)}" style="color:#2563eb;text-decoration:none;word-break:break-all;">${escapeHtml(protocolUrl)}</a> a zadajte 6-ciferný kód:
                </div>
                <div style="margin-top:6px;font-size:22px;font-weight:700;letter-spacing:6px;color:#2563eb;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;">
                  ${escapeHtml(code)}
                </div>
                ${
                  validUntil
                    ? `<div style="margin-top:12px;font-size:11px;color:#94a3b8;">Link platí do ${escapeHtml(validUntil)} (90 dní od vytvorenia protokolu).</div>`
                    : ""
                }
              </div>

              <p style="margin:24px 0 0;font-size:13px;color:#475569;line-height:1.5;">
                S pozdravom,<br />
                <strong style="color:#0f172a;">Tím ${BRAND}</strong><br />
                <a href="https://${BRAND_URL}" style="color:#2563eb;text-decoration:none;">${BRAND_URL}</a>
                ${contactEmail ? ` &middot; ${escapeHtml(contactEmail)}` : ""}
                ${contactPhone ? ` &middot; ${escapeHtml(contactPhone)}` : ""}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
              Tento email bol vygenerovaný automaticky. Pre otázky odpovedzte na ${escapeHtml(contactEmail || "info@elevatecars.sk")}.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
