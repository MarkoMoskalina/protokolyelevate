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
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { uploadFile, uploadSignature } from "@/lib/upload";
import { uuid } from "@/lib/uuid";
import type { ProtocolFormData } from "@/lib/form-types";
import { EMPTY_FORM, validateDraft, validateForm } from "@/lib/form-types";

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

  const isExistingDraft = !!form.protocol_id;

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
    const validationErrors = asDraft ? validateDraft(form) : validateForm(form);
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

    try {
      // Reuse the same storage folder for updates so we don't orphan files
      const protocolId = form.protocol_id ?? uuid();
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

      const payload = {
        ...(form.protocol_id ? { id: form.protocol_id } : {}),
        status: asDraft ? "draft" : "completed",
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
        expected_return_datetime: form.expected_return_datetime
          ? new Date(form.expected_return_datetime).toISOString()
          : null,
        location: form.location,
        mileage_km: form.mileage_km || null,
        mileage_photo_url: mileagePhotoUrl,
        fuel_level: form.fuel_level || null,
        fuel_photo_url: fuelPhotoUrl,
        allowed_km: form.allowed_km,
        deposit_amount: form.deposit_amount,
        deposit_method: form.deposit_method,
        car_photos: carPhotoUrls,
        damages: damagesData,
        signature_landlord_url: signatureLandlordUrl,
        signature_tenant_url: signatureTenantUrl,
        internal_notes: form.internal_notes,
      };

      const res = await fetch("/api/protocols", {
        method: form.protocol_id ? "PATCH" : "POST",
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
      } else {
        toast.success("Protokol bol vytvorený");
        router.push(`/protokol/${id}`);
      }
    } catch (err) {
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
        Nový odovzdávací protokol
      </h1>

      <div className="flex flex-col gap-6">
        {/* CUSTOMER */}
        <FormSection title="Zákazník">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Meno" error={errors.customer_first_name}>
              <div data-field="customer_first_name">
                <Input
                  value={form.customer_first_name}
                  onChange={(e) => update("customer_first_name", e.target.value)}
                  placeholder="Meno"
                  error={errors.customer_first_name}
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
                />
              </div>
            </FormField>
            <FormField label="Telefón">
              <Input
                type="tel"
                value={form.customer_phone}
                onChange={(e) => update("customer_phone", e.target.value)}
                placeholder="+421 9XX XXX XXX"
              />
            </FormField>
          </div>
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
        </FormSection>

        {/* VEHICLE */}
        <FormSection title="Vozidlo a prenájom">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Názov auta" error={errors.car_name}>
              <div data-field="car_name">
                <Input
                  value={form.car_name}
                  onChange={(e) => update("car_name", e.target.value)}
                  placeholder="napr. BMW 320d"
                  error={errors.car_name}
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
                />
              </div>
            </FormField>
          </div>
          <FormField label="Číslo rezervácie">
            <Input
              value={form.reservation_number}
              onChange={(e) => update("reservation_number", e.target.value)}
              placeholder="R-2026-XXXX"
              readOnly={!!form.reservation_id}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <div data-field="protocol_datetime">
              <DateTimePicker
                label="Dátum a čas odovzdania"
                value={form.protocol_datetime}
                onChange={(v) => update("protocol_datetime", v)}
                error={errors.protocol_datetime}
              />
            </div>
            <DateTimePicker
              label="Odhadovaný dátum vrátenia"
              value={form.expected_return_datetime}
              onChange={(v) => update("expected_return_datetime", v)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Miesto odovzdania">
              <Input
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="napr. Bratislava - letisko"
              />
            </FormField>
            <FormField label="Povolený nájazd km">
              <Input
                type="number"
                value={form.allowed_km}
                onChange={(e) => update("allowed_km", e.target.value)}
                placeholder="napr. 1500"
                min={0}
              />
            </FormField>
          </div>
        </FormSection>

        {/* VEHICLE CONDITION */}
        <FormSection title="Stav vozidla">
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
              label="Fotky auta"
              hint="Min. 4 fotky (predná, zadná, ľavá, pravá strana)"
              error={errors.car_photos}
            />
          </div>
          <DamagesSection
            damages={form.damages}
            onChange={(d) => update("damages", d)}
          />
        </FormSection>

        {/* FINANCES */}
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

          <button
            type="submit"
            disabled={!!submitting}
            className="w-full rounded-lg bg-brand-solid px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-solid_hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting === "completed" ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Vytváram protokol...
              </span>
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
