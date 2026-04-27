"use client";

import { useState } from "react";

import { ReservationPicker } from "@/components/protocol-form/reservation-picker";
import { ProtocolForm } from "@/components/protocol-form/protocol-form";
import type { ProtocolFormData } from "@/lib/form-types";

export default function NewProtocolPage() {
  const [step, setStep] = useState<"pick" | "form">("pick");
  const [initialData, setInitialData] = useState<Partial<ProtocolFormData>>({});

  function handleReservationSelect(patch: Partial<ProtocolFormData>) {
    setInitialData((prev) => ({ ...prev, ...patch }));
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
