"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useHousehold } from "@/contexts/HouseholdContext";
import { fetchScanResult, saveProduct } from "./actions";
import { StepBarcode } from "./StepBarcode";
import { StepDateCapture } from "./StepDateCapture";
import { StepReview } from "./StepReview";
import type { ScanResult } from "@/types";

type Step = "scan_barcode" | "capture_date" | "review" | "saving";

export default function ScanPage() {
  const { data: session } = useSession();
  const { household } = useHousehold();
  const router = useRouter();
  const token = session?.accessToken;

  const [step, setStep] = useState<Step>("scan_barcode");
  const [barcode, setBarcode] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [category, setCategory] = useState("");

  const applyScanResult = (result: ScanResult) => {
    setScanResult(result);
    setName(result.name);
    setExpirationDate(result.expirationDate ?? "");
    setCategory(result.category ?? "");
    setStep("review");
  };

  const handleBarcodeDetected = useCallback((code: string) => {
    setBarcode(code);
    setStep("capture_date");
  }, []);

  const handleDateCaptured = useCallback(
    async (base64: string) => {
      if (!barcode) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await fetchScanResult(barcode, token, base64);
        applyScanResult(result);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [barcode, token],
  );

  const handleSkipDateCapture = useCallback(async () => {
    if (!barcode) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchScanResult(barcode, token);
      applyScanResult(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [barcode, token]);

  const handleSave = useCallback(async () => {
    if (!household?._id) {
      setError("Aucun foyer sélectionné.");
      return;
    }
    setStep("saving");
    setError(null);
    try {
      await saveProduct(household._id, token, {
        name,
        brand: scanResult?.brand,
        category: category || undefined,
        barcode: barcode!,
        expirationDate,
        nutritionFacts: scanResult?.nutritionFacts,
      });
      router.push("/products");
    } catch (e) {
      setError((e as Error).message);
      setStep("review");
    }
  }, [name, category, expirationDate, barcode, scanResult, token, router, household]);

  const reset = () => {
    setStep("scan_barcode");
    setBarcode(null);
    setScanResult(null);
    setError(null);
  };

  return (
    <div className="flex flex-col gap-6 p-4 pt-6">
      {step === "scan_barcode" && (
        <StepBarcode onDetected={handleBarcodeDetected} token={token} />
      )}
      {step === "capture_date" && (
        <StepDateCapture
          barcode={barcode!}
          loading={loading}
          error={error}
          onCapture={handleDateCaptured}
          onSkip={handleSkipDateCapture}
        />
      )}
      {(step === "review" || step === "saving") && scanResult && (
        <StepReview
          step={step}
          scanResult={scanResult}
          name={name}
          expirationDate={expirationDate}
          category={category}
          error={error}
          onNameChange={setName}
          onExpirationDateChange={setExpirationDate}
          onCategoryChange={setCategory}
          onSave={handleSave}
          onCancel={reset}
        />
      )}
    </div>
  );
}
