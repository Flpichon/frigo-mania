"use client";

import { useReducer, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useHousehold } from "@/contexts/HouseholdContext";
import { fetchScanResult, saveProduct } from "./actions";
import { StepBarcode } from "./StepBarcode";
import { StepDateCapture } from "./StepDateCapture";
import { StepReview } from "./StepReview";
import type { ScanResult } from "@/types";

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

type ScanState =
  | { step: "scan_barcode" }
  | { step: "capture_date"; barcode: string }
  | {
      step: "review" | "saving";
      barcode: string;
      scanResult: ScanResult;
      name: string;
      expirationDate: string;
      category: string;
    };

type Action =
  | { type: "BARCODE_DETECTED"; barcode: string }
  | { type: "SCAN_RESULT_RECEIVED"; result: ScanResult }
  | {
      type: "SET_FIELD";
      field: "name" | "expirationDate" | "category";
      value: string;
    }
  | { type: "SAVE_START" }
  | { type: "SAVE_ERROR" }
  | { type: "RESET" };

function reducer(state: ScanState, action: Action): ScanState {
  switch (action.type) {
    case "BARCODE_DETECTED":
      return { step: "capture_date", barcode: action.barcode };

    case "SCAN_RESULT_RECEIVED":
      // Seul cas où step + scanResult + champs du formulaire changent tous en même
      // temps → transition atomique, pas de render intermédiaire incohérent.
      if (state.step !== "capture_date") {
        return state;
      }
      return {
        step: "review",
        barcode: state.barcode,
        scanResult: action.result,
        name: action.result.name,
        expirationDate: action.result.expirationDate ?? "",
        category: action.result.category ?? "",
      };

    case "SET_FIELD":
      if (state.step !== "review" && state.step !== "saving") {
        return state;
      }
      return { ...state, [action.field]: action.value };

    case "SAVE_START":
      if (state.step !== "review") {
        return state;
      }
      return { ...state, step: "saving" };

    case "SAVE_ERROR":
      if (state.step !== "saving") {
        return state;
      }
      return { ...state, step: "review" };

    case "RESET":
      return { step: "scan_barcode" };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ScanPage() {
  const { data: session } = useSession();
  const { household } = useHousehold();
  const router = useRouter();
  const token = session?.accessToken;

  const [state, dispatch] = useReducer(reducer, { step: "scan_barcode" });

  // loading et error n'ont pas de lien de cohérence avec step → useState séparés suffisent
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Couper le flux caméra AVANT de changer de step : sur iOS Safari, un flux
  // caméra actif pendant un appel fetch provoque une suspension de la webview
  // qui se traduit par un GET parasite sur /api/scan → 404, ce qui réinitialise
  // l'état et renvoie sur StepDateCapture.
  const [scannerActive, setScannerActive] = useState(true);

  const handleBarcodeDetected = useCallback((code: string) => {
    setScannerActive(false);
    dispatch({ type: "BARCODE_DETECTED", barcode: code });
  }, []);

  /**
   * Appelé quand la date a été résolue côté front (DateScanner OCR ou QuickDateInput).
   * On récupère les infos produit via le backend (sans image), puis on force
   * la date résolue front (plus fiable) dans le state de review.
   */
  const handleDateResolved = useCallback(
    async (isoDate: string) => {
      if (state.step !== "capture_date") {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await fetchScanResult(state.barcode, token);
        // Injecter la date résolue côté front avec confiance "high"
        const resultWithDate: ScanResult = {
          ...result,
          expirationDate: isoDate,
          expirationDateConfidence: "high",
          requiresManualReview: !result.name,
        };
        dispatch({ type: "SCAN_RESULT_RECEIVED", result: resultWithDate });
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [state, token],
  );

  /**
   * Skip : l'utilisateur ne souhaite pas renseigner la date maintenant.
   * On appelle le backend sans image → OCR skippé, confidence "none".
   */
  const handleSkipDateCapture = useCallback(async () => {
    if (state.step !== "capture_date") {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchScanResult(state.barcode, token);
      dispatch({ type: "SCAN_RESULT_RECEIVED", result });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [state, token]);

  const handleSave = useCallback(async () => {
    if (state.step !== "review") {
      return;
    }
    if (!household?._id) {
      setError("Aucun foyer sélectionné.");
      return;
    }
    dispatch({ type: "SAVE_START" });
    setError(null);
    try {
      await saveProduct(household._id, token, {
        name: state.name,
        brand: state.scanResult.brand,
        category: state.category || undefined,
        barcode: state.barcode,
        expirationDate: state.expirationDate,
        nutritionFacts: state.scanResult.nutritionFacts,
      });
      router.push("/products");
    } catch (e) {
      setError((e as Error).message);
      dispatch({ type: "SAVE_ERROR" });
    }
  }, [state, token, router, household]);

  const reset = useCallback(() => {
    setScannerActive(true);
    dispatch({ type: "RESET" });
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 pt-6">
      {state.step === "scan_barcode" && (
        <StepBarcode onDetected={handleBarcodeDetected} active={scannerActive} token={token} />
      )}
      {state.step === "capture_date" && (
        <StepDateCapture
          barcode={state.barcode}
          loading={loading}
          error={error}
          onDateResolved={handleDateResolved}
          onSkip={handleSkipDateCapture}
        />
      )}
      {(state.step === "review" || state.step === "saving") && (
        <StepReview
          step={state.step}
          scanResult={state.scanResult}
          name={state.name}
          expirationDate={state.expirationDate}
          category={state.category}
          error={error}
          onNameChange={(v) =>
            dispatch({ type: "SET_FIELD", field: "name", value: v })
          }
          onExpirationDateChange={(v) =>
            dispatch({ type: "SET_FIELD", field: "expirationDate", value: v })
          }
          onCategoryChange={(v) =>
            dispatch({ type: "SET_FIELD", field: "category", value: v })
          }
          onSave={handleSave}
          onCancel={reset}
        />
      )}
    </div>
  );
}
