"use client";

import { useState } from "react";

import { ReservationPicker } from "@/components/protocol-form/reservation-picker";
import { ProtocolForm } from "@/components/protocol-form/protocol-form";
import type { ProtocolFormData } from "@/lib/form-types";

interface NewProtocolClientProps {
  /**
   * Pre-fetched signed URL of the current employee's saved signature.
   * Will be merged into `signature_landlord` for both the picker-skip flow
   * and the reservation-prefilled flow so the user doesn't have to re-draw
   * their signature on every protocol.
   */
  defaultLandlordSignature: string | null;
}

export function NewProtocolClient({
  defaultLandlordSignature,
}: NewProtocolClientProps) {
  const [step, setStep] = useState<"pick" | "form">("pick");

  const baseDefaults: Partial<ProtocolFormData> = defaultLandlordSignature
    ? { signature_landlord: defaultLandlordSignature }
    : {};

  const [initialData, setInitialData] = useState<Partial<ProtocolFormData>>(
    baseDefaults,
  );

  function handleReservationSelect(patch: Partial<ProtocolFormData>) {
    // Merge in the saved signature unless the picker explicitly provided one
    // (e.g. when resuming a draft that already has a signature attached).
    setInitialData((prev) => ({
      ...baseDefaults,
      ...prev,
      ...patch,
    }));
    setStep("form");
  }

  function handleSkip() {
    setStep("form");
  }

  if (step === "pick") {
    return (
      <ReservationPicker
        onSelect={handleReservationSelect}
        onSkip={handleSkip}
      />
    );
  }

  return <ProtocolForm initialData={initialData} />;
}
