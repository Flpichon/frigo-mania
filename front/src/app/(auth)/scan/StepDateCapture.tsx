"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { DateScanner } from "@/components/DateScanner";
import { QuickDateInput } from "@/components/QuickDateInput";

interface Props {
  barcode: string;
  loading: boolean;
  error: string | null;
  onDateResolved: (isoDate: string) => void;
  onSkip: () => void;
}

export function StepDateCapture({
  barcode,
  loading,
  error,
  onDateResolved,
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
        Date de péremption
      </h2>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="animate-spin text-green-600" size={32} />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Scanner vidéo temps réel */}
          <section>
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500">
              Scanner la date
            </p>
            <DateScanner onCapture={onDateResolved} />
          </section>

          {/* Séparateur */}
          <div className="flex items-center gap-3">
            <hr className="flex-1 border-gray-200 dark:border-zinc-700" />
            <span className="text-xs text-gray-400">ou saisir manuellement</span>
            <hr className="flex-1 border-gray-200 dark:border-zinc-700" />
          </div>

          {/* Saisie manuelle rapide */}
          <section>
            <QuickDateInput onCapture={onDateResolved} />
          </section>
        </div>
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
