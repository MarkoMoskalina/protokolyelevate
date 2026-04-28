import path from "node:path";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";

import type { Protocol } from "@/lib/protocols";

const fontsDir = path.join(process.cwd(), "public", "fonts");

Font.register({
  family: "Roboto",
  fonts: [
    { src: path.join(fontsDir, "Roboto-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontsDir, "Roboto-Medium.ttf"), fontWeight: 600 },
    { src: path.join(fontsDir, "Roboto-Bold.ttf"), fontWeight: 700 },
    {
      src: path.join(fontsDir, "Roboto-Italic.ttf"),
      fontWeight: 400,
      fontStyle: "italic",
    },
  ],
});

export interface CompanyInfo {
  email?: string;
  phone?: string;
}

export interface DamageItem {
  description: string;
  photo_urls: string[];
}

export interface ProtocolPdfData {
  protocol: Protocol;
  company: CompanyInfo;
  appUrl: string;
  signatureLandlordDataUrl?: string | null;
  signatureTenantDataUrl?: string | null;
}

const COLORS = {
  primary: "#0f172a",
  secondary: "#475569",
  muted: "#94a3b8",
  border: "#e2e8f0",
  bg: "#f8fafc",
  brand: "#2563eb",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 48,
    paddingHorizontal: 32,
    fontSize: 10,
    color: COLORS.primary,
    fontFamily: "Roboto",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: "column",
  },
  headerRight: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  brand: {
    fontSize: 18,
    fontWeight: 700,
    color: COLORS.brand,
  },
  brandSub: {
    fontSize: 9,
    color: COLORS.secondary,
    marginTop: 2,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.primary,
  },
  docMeta: {
    fontSize: 9,
    color: COLORS.secondary,
    marginTop: 2,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.primary,
    backgroundColor: COLORS.bg,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  col2: {
    width: "50%",
    paddingRight: 8,
    marginBottom: 4,
  },
  col3: {
    width: "33.33%",
    paddingRight: 8,
    marginBottom: 4,
  },
  label: {
    fontSize: 8,
    color: COLORS.muted,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  value: {
    fontSize: 10,
    color: COLORS.primary,
  },
  emptyValue: {
    fontSize: 10,
    color: COLORS.muted,
    fontStyle: "italic",
  },
  damageBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
  },
  damageDescription: {
    fontSize: 10,
    marginBottom: 4,
  },
  damageMeta: {
    fontSize: 8,
    color: COLORS.muted,
  },
  signaturesRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 6,
  },
  signatureBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 6,
    alignItems: "center",
    minHeight: 90,
  },
  signatureImg: {
    height: 60,
    width: "auto",
    objectFit: "contain",
  },
  signatureLabel: {
    fontSize: 9,
    color: COLORS.secondary,
    marginTop: 4,
  },
  accessBox: {
    marginTop: 18,
    padding: 10,
    backgroundColor: COLORS.bg,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.brand,
  },
  accessTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 4,
  },
  accessText: {
    fontSize: 9,
    color: COLORS.secondary,
    marginBottom: 2,
  },
  accessCode: {
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 4,
    color: COLORS.brand,
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: COLORS.muted,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function depositLabel(method: string | null | undefined): string {
  switch (method) {
    case "cash":
      return "Hotovosť";
    case "bank_transfer":
      return "Bankový prevod";
    case "card_hold":
      return "Zadržané na karte";
    default:
      return "—";
  }
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  const isEmpty = !value || value === "—";
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Text style={isEmpty ? styles.emptyValue : styles.value}>
        {isEmpty ? "—" : value}
      </Text>
    </View>
  );
}

export function ProtocolPdf({
  protocol,
  company,
  appUrl,
  signatureLandlordDataUrl,
  signatureTenantDataUrl,
}: ProtocolPdfData) {
  const isReturn = protocol.type === "return";
  const title = isReturn ? "Preberací protokol" : "Odovzdávací protokol";
  const damages = (protocol.damages as unknown as DamageItem[]) || [];

  return (
    <Document
      title={`${title} ${shortId(protocol.id)}`}
      author="Elevate Cars"
      creator="Elevate Cars"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brand}>Elevate Cars</Text>
            <Text style={styles.brandSub}>elevatecars.sk</Text>
            {company.email ? (
              <Text style={styles.brandSub}>
                {company.email}
                {company.phone ? `  •  ${company.phone}` : ""}
              </Text>
            ) : null}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>{title}</Text>
            <Text style={styles.docMeta}>Č. protokolu: {shortId(protocol.id)}</Text>
            <Text style={styles.docMeta}>
              Dátum: {formatDateTime(protocol.protocol_datetime)}
            </Text>
            {protocol.reservation_number ? (
              <Text style={styles.docMeta}>
                Rezervácia: {protocol.reservation_number}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Customer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zákazník</Text>
          <View style={styles.row}>
            <View style={styles.col2}>
              <Field
                label="Meno a priezvisko"
                value={`${protocol.customer_first_name} ${protocol.customer_last_name}`}
              />
            </View>
            <View style={styles.col2}>
              <Field label="Email" value={protocol.customer_email} />
            </View>
            <View style={styles.col2}>
              <Field label="Telefón" value={protocol.customer_phone} />
            </View>
          </View>
        </View>

        {/* Vehicle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vozidlo</Text>
          <View style={styles.row}>
            <View style={styles.col2}>
              <Field label="Vozidlo" value={protocol.car_name} />
            </View>
            <View style={styles.col2}>
              <Field label="ŠPZ" value={protocol.car_license_plate} />
            </View>
            <View style={styles.col2}>
              <Field label="Miesto" value={protocol.location} />
            </View>
            <View style={styles.col2}>
              <Field
                label={isReturn ? "Dátum a čas vrátenia" : "Dátum a čas odovzdania"}
                value={formatDateTime(protocol.protocol_datetime)}
              />
            </View>
            {!isReturn ? (
              <View style={styles.col2}>
                <Field
                  label="Odhadovaný návrat"
                  value={formatDateTime(protocol.expected_return_datetime)}
                />
              </View>
            ) : null}
            {!isReturn ? (
              <View style={styles.col2}>
                <Field
                  label="Povolený nájazd km"
                  value={protocol.allowed_km != null ? `${protocol.allowed_km} km` : null}
                />
              </View>
            ) : null}
          </View>
        </View>

        {/* Vehicle condition */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stav vozidla</Text>
          <View style={styles.row}>
            <View style={styles.col2}>
              <Field
                label="Stav tachometra"
                value={
                  protocol.mileage_km != null
                    ? `${protocol.mileage_km.toLocaleString("sk-SK")} km`
                    : null
                }
              />
            </View>
            <View style={styles.col2}>
              <Field label="Stav paliva" value={protocol.fuel_level} />
            </View>
          </View>
        </View>

        {/* Return-only: km exceedance */}
        {isReturn && protocol.km_exceeded != null ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prekročenie nájazdu</Text>
            <View style={styles.row}>
              <View style={styles.col3}>
                <Field
                  label="Prekročené km"
                  value={`${protocol.km_exceeded} km`}
                />
              </View>
              <View style={styles.col3}>
                <Field
                  label="Sadzba"
                  value={
                    protocol.extra_km_rate != null
                      ? `${formatCurrency(protocol.extra_km_rate)} / km`
                      : null
                  }
                />
              </View>
              <View style={styles.col3}>
                <Field
                  label="K úhrade"
                  value={formatCurrency(protocol.km_exceeded_price)}
                />
              </View>
            </View>
          </View>
        ) : null}

        {/* Finances (handover only) */}
        {!isReturn ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Depozit</Text>
            <View style={styles.row}>
              <View style={styles.col2}>
                <Field label="Suma" value={formatCurrency(protocol.deposit_amount)} />
              </View>
              <View style={styles.col2}>
                <Field label="Spôsob" value={depositLabel(protocol.deposit_method)} />
              </View>
            </View>
          </View>
        ) : null}

        {/* Damages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Poškodenia ({damages.length})
          </Text>
          {damages.length === 0 ? (
            <Text style={styles.emptyValue}>Bez zaznamenaných poškodení</Text>
          ) : (
            damages.map((d, i) => (
              <View key={i} style={styles.damageBox}>
                <Text style={styles.damageDescription}>
                  {i + 1}. {d.description || "(bez popisu)"}
                </Text>
                {d.photo_urls?.length ? (
                  <Text style={styles.damageMeta}>
                    Pripojených fotiek: {d.photo_urls.length}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </View>

        {/* Signatures */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Podpisy</Text>
          <View style={styles.signaturesRow}>
            <View style={styles.signatureBox}>
              {signatureLandlordDataUrl ? (
                <Image src={signatureLandlordDataUrl} style={styles.signatureImg} />
              ) : (
                <Text style={styles.emptyValue}>(bez podpisu)</Text>
              )}
              <Text style={styles.signatureLabel}>Prenajímateľ</Text>
            </View>
            <View style={styles.signatureBox}>
              {signatureTenantDataUrl ? (
                <Image src={signatureTenantDataUrl} style={styles.signatureImg} />
              ) : (
                <Text style={styles.emptyValue}>(bez podpisu)</Text>
              )}
              <Text style={styles.signatureLabel}>Nájomca</Text>
            </View>
          </View>
        </View>

        {/* Access info */}
        <View style={styles.accessBox} wrap={false}>
          <Text style={styles.accessTitle}>Fotodokumentácia online</Text>
          <Text style={styles.accessText}>
            Pre zobrazenie kompletnej fotodokumentácie navštívte:
          </Text>
          <Text style={styles.accessText}>{appUrl}/zobrazenie</Text>
          <Text style={styles.accessText}>a zadajte kód:</Text>
          <Text style={styles.accessCode}>{protocol.access_code}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Elevate Cars  •  elevatecars.sk</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Strana ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
