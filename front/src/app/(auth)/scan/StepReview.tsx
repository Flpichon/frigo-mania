"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { Field } from "./Field";
import { QuickDateInput } from "@/components/QuickDateInput";
import type { ScanResult } from "@/types";

type Step = "review" | "saving";

interface Props {
  step: Step;
  scanResult: ScanResult;
  name: string;
  expirationDate: string;
  category: string;
  error: string | null;
  onNameChange: (v: string) => void;
  onExpirationDateChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function StepReview({
  step,
  scanResult,
  name,
  expirationDate,
  category,
  error,
  onNameChange,
  onExpirationDateChange,
  onCategoryChange,
  onSave,
  onCancel,
}: Props) {
  const dateNeedsReview =
    scanResult.expirationDateConfidence === "none" ||
    scanResult.expirationDateConfidence === "low";

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100">
          Confirmer le produit
        </h2>
        {scanResult.requiresManualReview && (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <AlertTriangle size={12} />À vérifier
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <Field
          label="Nom du produit *"
          value={name}
          onChange={onNameChange}
          placeholder="ex: Yaourt nature"
        />
        {dateNeedsReview && !expirationDate ? (
          <div>
            <span className="mb-2 block text-xs font-medium text-amber-600 dark:text-amber-400">
              Date de péremption * — non détectée, saisissez-la
            </span>
            <QuickDateInput
              onCapture={onExpirationDateChange}
            />
          </div>
        ) : (
          <Field
            label="Date de péremption *"
            value={expirationDate}
            onChange={onExpirationDateChange}
            type="date"
            highlight={dateNeedsReview}
          />
        )}
        <Field
          label="Catégorie"
          value={category}
          onChange={onCategoryChange}
          placeholder="ex: Produits laitiers"
        />
        {scanResult.brand && (
          <p className="text-sm text-gray-500">
            Marque :{" "}
            <span className="font-medium text-gray-700 dark:text-zinc-300">
              {scanResult.brand}
            </span>
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-full border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Annuler
        </button>
        <button
          onClick={onSave}
          disabled={step === "saving" || !name || !expirationDate}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {step === "saving" && (
            <Loader2 size={16} className="animate-spin" />
          )}
          Ajouter au frigo
        </button>
      </div>
    </>
  );
}
