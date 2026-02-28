"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { DateCapture } from "@/components/DateCapture";

interface Props {
  barcode: string;
  loading: boolean;
  error: string | null;
  onCapture: (base64: string) => void;
  onSkip: () => void;
}

export function StepDateCapture({
  barcode,
  loading,
  error,
  onCapture,
  onSkip,
}: Props) {
  return (
    <>
      <div className="flex items-center gap-2">
        <CheckCircle2 size={18} className="text-green-600" />
        <p className="text-sm text-gray-700 dark:text-zinc-300">
          Code-barres lu :{" "}
          <span className="font-mono font-semibold">{barcode}</span>
        </p>
      </div>

      <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100">
        Photo de la date de péremption
      </h2>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="animate-spin text-green-600" size={32} />
        </div>
      ) : (
        <DateCapture onCapture={onCapture} />
      )}

      <button
        onClick={onSkip}
        disabled={loading}
        className="text-center text-sm text-gray-400 underline underline-offset-2 hover:text-gray-600 disabled:opacity-50"
      >
        Passer — je saisirai la date manuellement
      </button>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}
    </>
  );
}
