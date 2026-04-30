"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Bookmark } from "lucide-react";
import { toast } from "sonner";

import { FormSection } from "@/components/protocol-form/form-section";
import { FormField, Input, Textarea, Select } from "@/components/protocol-form/form-field";
import { PhotoUpload } from "@/components/photo-upload/photo-upload";
import { MultiPhotoUpload } from "@/components/photo-upload/multi-photo-upload";
import { FuelLevelPicker } from "@/components/fuel-level-picker/fuel-level-picker";
import { DamagesSection } from "@/components/protocol-form/damages-section";
import { SignaturePad } from "@/components/signature-pad/signature-pad";
import { KmExceedanceSummary } from "@/components/protocol-form/km-exceedance-summary";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { uploadFile, uploadSignature } from "@/lib/upload";
import { uuid } from "@/lib/uuid";
import type { ProtocolFormData } from "@/lib/form-types";
import {
  EMPTY_FORM,
  validateDraft,
  validateForm,
  validateReturnForm,
} from "@/lib/form-types";

interface ProtocolFormProps {
  initialData?: Partial<ProtocolFormData>;
}

const DEPOSIT_OPTIONS = [
  { value: "cash", label: "Hotovosť" },
  { value: "bank_transfer", label: "Bankový prevod" },
  { value: "card_hold", label: "Zadržané na karte" },
];

export function ProtocolForm({ initialData }: ProtocolFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<ProtocolFormData>({
    ...EMPTY_FORM,
    ...initialData,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<false | "draft" | "completed">(false);

  const isReturn = form.mode === "return";
  const isExistingDraft = !isReturn && !!form.protocol_id;

  const update = useCallback(
    <K extends keyof ProtocolFormData>(key: K, value: ProtocolFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        if (prev[key]) {
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return prev;
      });
    },
    [],
  );

  async function submitProtocol(asDraft: boolean) {
    const validationErrors = isReturn
      ? validateReturnForm(form)
      : asDraft
        ? validateDraft(form)
        : validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstErrorKey = Object.keys(validationErrors)[0];
      document.querySelector(`[data-field="${firstErrorKey}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      toast.error("Vyplňte povinné polia");
      return;
    }

    setSubmitting(asDraft ? "draft" : "completed");

    // Spočítame všetky súbory čakajúce na kompresiu+upload, aby sme používateľovi
    // ukázali zmysluplný progress (kompresia 12MP fotky trvá 1-3s na strednom mobile).
    const fileCount =
      [
        form.customer_id_card_front,
        form.customer_id_card_back,
        form.customer_driver_license,
        form.mileage_photo,
        form.fuel_photo,
      ].filter((v) => v instanceof File).length +
      form.car_photos.filter((v) => v instanceof File).length +
      form.damages.reduce(
        (sum, d) => sum + d.photos.filter((v) => v instanceof File).length,
        0,
      );

    const uploadToastId =
      fileCount > 0
        ? toast.loading(
            fileCount === 1
              ? "Spracovávam fotku..."
              : `Spracovávam ${fileCount} fotiek...`,
          )
        : null;

    try {
      // Reuse the same storage folder for updates so we don't orphan files.
      // For return protocols we always create a new id (no draft flow).
      const protocolId = isReturn ? uuid() : (form.protocol_id ?? uuid());
      const folder = `protocols/${protocolId}`;

      // For new file -> upload to protocol-photos and return path.
      // For string value:
      //   - signed/public URL of an object in protocol-photos -> extract and return path
      //   - signed URL from customer-documents (or any other source) -> fetch + re-upload
      //     into protocol-photos so the protocol owns its own copy
      //   - already a clean path -> return as-is
      const uploadOrKeep = async (
        value: File | string | null,
        folder: string,
      ): Promise<string | null> => {
        if (value instanceof File) return uploadFile(value, folder);
        if (!value) return null;

        const ppMatch = value.match(
          /\/storage\/v1\/object\/(?:sign|public)\/protocol-photos\/([^?]+)/,
        );
        if (ppMatch) return decodeURIComponent(ppMatch[1]);

        if (value.startsWith("http")) {
          try {
            const blob = await (await fetch(value)).blob();
            const ext = (blob.type.split("/")[1] || "jpg").split(";")[0];
            const file = new File([blob], `import.${ext}`, { type: blob.type });
            return uploadFile(file, folder);
          } catch {
            return null;
          }
        }

        return value;
      };

      // Signature value can be a base64 data URL (newly drawn) or a storage URL/path (loaded draft).
      // Data URLs need to be converted to a file and uploaded, the rest goes through uploadOrKeep.
      const uploadSignatureOrKeep = async (
        value: string,
      ): Promise<string | null> => {
        if (!value) return null;
        if (value.startsWith("data:")) {
          return uploadSignature(value, `${folder}/signatures`);
        }
        return uploadOrKeep(value, `${folder}/signatures`);
      };

      const [
        idFrontUrl,
        idBackUrl,
        driverLicenseUrl,
        mileagePhotoUrl,
        fuelPhotoUrl,
        carPhotoUrls,
        damagesData,
        signatureLandlordUrl,
        signatureTenantUrl,
      ] = await Promise.all([
        uploadOrKeep(form.customer_id_card_front, `${folder}/id-card`),
        uploadOrKeep(form.customer_id_card_back, `${folder}/id-card`),
        uploadOrKeep(form.customer_driver_license, `${folder}/driver-license`),
        uploadOrKeep(form.mileage_photo, `${folder}/mileage`),
        uploadOrKeep(form.fuel_photo, `${folder}/fuel`),
        Promise.all(
          form.car_photos.map((f) => uploadOrKeep(f, `${folder}/car`)),
        ),
        Promise.all(
          form.damages.map(async (d) => ({
            description: d.description,
            photo_urls: (
              await Promise.all(
                d.photos.map((f) => uploadOrKeep(f, `${folder}/damages`)),
              )
            ).filter(Boolean),
          })),
        ),
        uploadSignatureOrKeep(form.signature_landlord),
        uploadSignatureOrKeep(form.signature_tenant),
      ]);

      if (uploadToastId !== null) toast.dismiss(uploadToastId);

      const payload = {
        ...(form.protocol_id && !isReturn ? { id: form.protocol_id } : {}),
        type: isReturn ? "return" : "handover",
        status: asDraft ? "draft" : "completed",
        handover_protocol_id: form.handover_protocol_id,
        reservation_id: form.reservation_id,
        car_id: form.car_id,
        customer_first_name: form.customer_first_name,
        customer_last_name: form.customer_last_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone,
        customer_id_card_front_url: idFrontUrl,
        customer_id_card_back_url: idBackUrl,
        customer_driver_license_url: driverLicenseUrl,
        car_name: form.car_name,
        car_license_plate: form.car_license_plate,
        reservation_number: form.reservation_number,
        protocol_datetime: form.protocol_datetime
          ? new Date(form.protocol_datetime).toISOString()
          : new Date().toISOString(),
        expected_return_datetime: isReturn
          ? null
          : form.expected_return_datetime
            ? new Date(form.expected_return_datetime).toISOString()
            : null,
        location: form.location,
        mileage_km: form.mileage_km || null,
        mileage_photo_url: mileagePhotoUrl,
        fuel_level: form.fuel_level || null,
        fuel_photo_url: fuelPhotoUrl,
        // Handover-only fields are set to null for return protocols
        allowed_km: isReturn ? null : form.allowed_km,
        deposit_amount: isReturn ? null : form.deposit_amount,
        deposit_method: isReturn ? null : form.deposit_method,
        car_photos: carPhotoUrls,
        damages: damagesData,
        signature_landlord_url: signatureLandlordUrl,
        signature_tenant_url: signatureTenantUrl,
        internal_notes: form.internal_notes,
      };

      const res = await fetch("/api/protocols", {
        method: form.protocol_id && !isReturn ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Nepodarilo sa uložiť protokol");
      }

      const { id } = await res.json();

      if (asDraft) {
        toast.success("Predpripravený protokol bol uložený");
        router.push("/novy");
        return;
      }

      // Generate PDF + send email, then redirect.
      // Protocol is already saved so we don't fail on PDF/email errors.
      const toastId = toast.loading("Generujem PDF a posielam email...");

      try {
        const pdfRes = await fetch(`/api/protocols/${id}/pdf`, {
          method: "POST",
        });
        if (!pdfRes.ok) {
          const data = await pdfRes.json().catch(() => ({}));
          throw new Error(data.error || "Generovanie PDF zlyhalo");
        }

        const emailRes = await fetch(`/api/protocols/${id}/email`, {
          method: "POST",
        });
        if (!emailRes.ok) {
          const data = await emailRes.json().catch(() => ({}));
          throw new Error(data.error || "Odoslanie emailu zlyhalo");
        }

        toast.success("Protokol bol vytvorený a odoslaný zákazníkovi", {
          id: toastId,
        });
      } catch (pdfEmailErr) {
        toast.error(
          `Protokol uložený, ale: ${pdfEmailErr instanceof Error ? pdfEmailErr.message : String(pdfEmailErr)}`,
          { id: toastId },
        );
      }

      router.push(`/protokol/${id}`);
    } catch (err) {
      if (uploadToastId !== null) toast.dismiss(uploadToastId);
      toast.error(
        err instanceof Error ? err.message : "Nepodarilo sa uložiť protokol",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitProtocol(false);
  }

  function handleSaveDraft() {
    submitProtocol(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-3xl px-4 py-6"
    >
      <h1 className="mb-6 text-lg font-semibold text-primary">
        {isReturn ? "Nový preberací protokol" : "Nový odovzdávací protokol"}
      </h1>

      <div className="flex flex-col gap-6">
        {/* CUSTOMER */}
        <FormSection
          title="Zákazník"
          description={
            isReturn
              ? "Údaje sú prenesené z odovzdávacieho protokolu"
              : undefined
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Meno" error={errors.customer_first_name}>
              <div data-field="customer_first_name">
                <Input
                  value={form.customer_first_name}
                  onChange={(e) => update("customer_first_name", e.target.value)}
                  placeholder="Meno"
                  error={errors.customer_first_name}
                  readOnly={isReturn}
                />
              </div>
            </FormField>
            <FormField label="Priezvisko" error={errors.customer_last_name}>
              <div data-field="customer_last_name">
                <Input
                  value={form.customer_last_name}
                  onChange={(e) => update("customer_last_name", e.target.value)}
                  placeholder="Priezvisko"
                  error={errors.customer_last_name}
                  readOnly={isReturn}
                />
              </div>
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Email" error={errors.customer_email}>
              <div data-field="customer_email">
                <Input
                  type="email"
                  value={form.customer_email}
                  onChange={(e) => update("customer_email", e.target.value)}
                  placeholder="email@priklad.sk"
                  error={errors.customer_email}
                  readOnly={isReturn}
                />
              </div>
            </FormField>
            <FormField label="Telefón">
              <Input
                type="tel"
                value={form.customer_phone}
                onChange={(e) => update("customer_phone", e.target.value)}
                placeholder="+421 9XX XXX XXX"
                readOnly={isReturn}
              />
            </FormField>
          </div>
          {!isReturn && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div data-field="customer_id_card_front">
                <PhotoUpload
                  value={form.customer_id_card_front}
                  onChange={(f) => update("customer_id_card_front", f)}
                  label="OP — predná strana"
                  error={errors.customer_id_card_front}
                />
              </div>
              <div data-field="customer_id_card_back">
                <PhotoUpload
                  value={form.customer_id_card_back}
                  onChange={(f) => update("customer_id_card_back", f)}
                  label="OP — zadná strana"
                  error={errors.customer_id_card_back}
                />
              </div>
              <div data-field="customer_driver_license">
                <PhotoUpload
                  value={form.customer_driver_license}
                  onChange={(f) => update("customer_driver_license", f)}
                  label="Vodičský preukaz"
                  error={errors.customer_driver_license}
                />
              </div>
            </div>
          )}
        </FormSection>

        {/* VEHICLE */}
        <FormSection
          title={isReturn ? "Vozidlo" : "Vozidlo a prenájom"}
          description={
            isReturn
              ? "Údaje sú prenesené z odovzdávacieho protokolu"
              : undefined
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Názov auta" error={errors.car_name}>
              <div data-field="car_name">
                <Input
                  value={form.car_name}
                  onChange={(e) => update("car_name", e.target.value)}
                  placeholder="napr. BMW 320d"
                  error={errors.car_name}
                  readOnly={isReturn}
                />
              </div>
            </FormField>
            <FormField label="ŠPZ" error={errors.car_license_plate}>
              <div data-field="car_license_plate">
                <Input
                  value={form.car_license_plate}
                  onChange={(e) => update("car_license_plate", e.target.value)}
                  placeholder="BA-123-AB"
                  error={errors.car_license_plate}
                  readOnly={isReturn}
                />
              </div>
            </FormField>
          </div>
          <FormField label="Číslo rezervácie">
            <Input
              value={form.reservation_number}
              onChange={(e) => update("reservation_number", e.target.value)}
              placeholder="R-2026-XXXX"
              readOnly={!!form.reservation_id || isReturn}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <div data-field="protocol_datetime">
              <DateTimePicker
                label={isReturn ? "Dátum a čas vrátenia" : "Dátum a čas odovzdania"}
                value={form.protocol_datetime}
                onChange={(v) => update("protocol_datetime", v)}
                error={errors.protocol_datetime}
              />
            </div>
            {!isReturn && (
              <DateTimePicker
                label="Odhadovaný dátum vrátenia"
                value={form.expected_return_datetime}
                onChange={(v) => update("expected_return_datetime", v)}
              />
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={isReturn ? "Miesto vrátenia" : "Miesto odovzdania"}>
              <Input
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="napr. Bratislava - letisko"
              />
            </FormField>
            {!isReturn && (
              <FormField label="Povolený nájazd km">
                <Input
                  type="number"
                  value={form.allowed_km}
                  onChange={(e) => update("allowed_km", e.target.value)}
                  placeholder="napr. 1500"
                  min={0}
                />
              </FormField>
            )}
          </div>
        </FormSection>

        {/* VEHICLE CONDITION */}
        <FormSection
          title={isReturn ? "Stav pri vrátení" : "Stav vozidla"}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div data-field="mileage_photo">
              <PhotoUpload
                value={form.mileage_photo}
                onChange={(f) => update("mileage_photo", f)}
                label="Fotka tachometra"
                error={errors.mileage_photo}
              />
            </div>
            <FormField label="Stav tachometra (km)" error={errors.mileage_km}>
              <div data-field="mileage_km">
                <Input
                  type="number"
                  value={form.mileage_km}
                  onChange={(e) => update("mileage_km", e.target.value)}
                  placeholder="napr. 45230"
                  min={0}
                  error={errors.mileage_km}
                />
              </div>
            </FormField>
          </div>

          {/* Km exceedance summary (return only) */}
          {isReturn && (
            <KmExceedanceSummary
              handoverMileageKm={form.handover_mileage_km}
              allowedKm={form.handover_allowed_km}
              currentMileageInput={form.mileage_km}
              extraKmRate={form.extra_km_rate}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div data-field="fuel_photo">
              <PhotoUpload
                value={form.fuel_photo}
                onChange={(f) => update("fuel_photo", f)}
                label="Fotka paliva"
                error={errors.fuel_photo}
              />
            </div>
            <div data-field="fuel_level">
              <FuelLevelPicker
                value={form.fuel_level}
                onChange={(v) => update("fuel_level", v)}
                error={errors.fuel_level}
              />
            </div>
          </div>
          <div data-field="car_photos">
            <MultiPhotoUpload
              value={form.car_photos}
              onChange={(files) => update("car_photos", files)}
              label={isReturn ? "Fotky auta pri vrátení" : "Fotky auta"}
              hint={
                isReturn
                  ? "Min. 4 fotky (predná, zadná, ľavá, pravá strana)"
                  : "Min. 4 fotky (predná, zadná, ľavá, pravá strana)"
              }
              error={errors.car_photos}
            />
          </div>
          <DamagesSection
            damages={form.damages}
            onChange={(d) => update("damages", d)}
            title={isReturn ? "Nové poškodenia" : "Poškodenia"}
          />
        </FormSection>

        {/* FINANCES — handover only */}
        {!isReturn && (
          <FormSection title="Financie">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Depozit (EUR)">
                <Input
                  type="number"
                  value={form.deposit_amount}
                  onChange={(e) => update("deposit_amount", e.target.value)}
                  placeholder="napr. 500"
                  min={0}
                  step="0.01"
                />
              </FormField>
              <FormField label="Spôsob depozitu">
                <Select
                  value={form.deposit_method}
                  onChange={(e) =>
                    update(
                      "deposit_method",
                      e.target.value as ProtocolFormData["deposit_method"],
                    )
                  }
                  options={DEPOSIT_OPTIONS}
                  placeholder="Vyberte spôsob..."
                />
              </FormField>
            </div>
          </FormSection>
        )}

        {/* NOTES */}
        <FormSection
          title="Interné poznámky"
          description="Tieto poznámky nebudú viditeľné pre zákazníka"
        >
          <Textarea
            value={form.internal_notes}
            onChange={(e) => update("internal_notes", e.target.value)}
            placeholder="Interné poznámky..."
          />
        </FormSection>

        {/* SIGNATURES */}
        <FormSection title="Podpisy">
          <div className="grid gap-4 sm:grid-cols-2" data-field="signature_landlord">
            <SignaturePad
              label="Podpis prenajímateľa"
              value={form.signature_landlord}
              onChange={(v) => update("signature_landlord", v)}
              error={errors.signature_landlord}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2" data-field="signature_tenant">
            <SignaturePad
              label="Podpis nájomcu"
              value={form.signature_tenant}
              onChange={(v) => update("signature_tenant", v)}
              error={errors.signature_tenant}
            />
          </div>
        </FormSection>

        {/* SUBMIT */}
        <div className="flex flex-col gap-2">
          {!isReturn && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={!!submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-secondary transition-colors hover:bg-secondary_hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting === "draft" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ukladám...
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4" />
                  {isExistingDraft ? "Aktualizovať predpripravené" : "Uložiť ako predpripravené"}
                </>
              )}
            </button>
          )}

          <button
            type="submit"
            disabled={!!submitting}
            className="w-full rounded-lg bg-brand-solid px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-solid_hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting === "completed" ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isReturn ? "Vytváram preberací protokol..." : "Vytváram protokol..."}
              </span>
            ) : isReturn ? (
              "Vytvoriť preberací protokol"
            ) : (
              "Vytvoriť protokol"
            )}
          </button>

          {isExistingDraft && (
            <p className="text-center text-xs text-tertiary">
              Pokračujete v predpripravenom protokole — uložením vytvoríte finálny protokol
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
