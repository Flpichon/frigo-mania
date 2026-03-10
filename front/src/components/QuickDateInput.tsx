"use client";

import { JSX, useState } from "react";
import { CalendarDays, Check } from "lucide-react";

interface Props {
  onCapture: (isoDate: string) => void;
  initialDate?: string;
}

// ── Raccourcis ────────────────────────────────────────────────────────────────

interface Shortcut {
  label: string;
  days: number;
}

const SHORTCUTS: Shortcut[] = [
  { label: "+3j", days: 3 },
  { label: "+1 sem", days: 7 },
  { label: "+2 sem", days: 14 },
  { label: "+1 mois", days: 30 },
  { label: "+3 mois", days: 90 },
  { label: "+6 mois", days: 182 },
  { label: "+1 an", days: 365 },
];

function addDaysToToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isoToDisplay(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ── Parsing du champ numérique formaté ───────────────────────────────────────

/**
 * Auto-formate la saisie brute (chiffres seulement) :
 * "1"      → "1"
 * "15"     → "15"
 * "150"    → "15/0"
 * "1503"   → "15/03"
 * "15032"  → "15/03/2"
 * "150326" → "15/03/26"   (AA = 2026)
 * "1503202"→ "15/03/202"
 * "15032026"→ "15/03/2026"
 */
function formatNumericInput(digits: string): string {
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

/**
 * Tente de parser le champ formaté en date ISO.
 * Retourne null si incomplet ou invalide.
 */
function parseFormattedInput(formatted: string): string | null {
  const digits = formatted.replace(/\D/g, "");
  if (digits.length < 6) {
    return null;
  }

  const day = parseInt(digits.slice(0, 2), 10);
  const month = parseInt(digits.slice(2, 4), 10);
  const yearRaw = digits.slice(4);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  let year: number;
  if (yearRaw.length === 2) {
    year = 2000 + parseInt(yearRaw, 10);
  } else if (yearRaw.length === 4) {
    year = parseInt(yearRaw, 10);
  } else {
    return null;
  }

  if (year < 2020 || year > 2099) {
    return null;
  }

  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    isNaN(d.getTime()) ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return d.toISOString().slice(0, 10);
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function QuickDateInput({ onCapture, initialDate }: Props): JSX.Element {
  // Valeur brute du champ numérique (chiffres seulement, max 8)
  const [digits, setDigits] = useState<string>(() => {
    if (!initialDate) {
      return "";
    }
    // Pré-remplir depuis une date ISO : YYYY-MM-DD → DDMMYYYY
    const [y, m, d] = initialDate.split("-");
    return `${d}${m}${y}`;
  });

  const [activeShortcut, setActiveShortcut] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    initialDate ?? null,
  );

  // Valeur affichée dans le champ (formatée)
  const displayValue = formatNumericInput(digits);
  // Date ISO tentative depuis le champ (null si incomplet/invalide)
  const parsedFromField = parseFormattedInput(displayValue);

  // ── Gestionnaire du champ numérique ────────────────────────────────────
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 8);
    setDigits(raw);
    setActiveShortcut(null);
    setSelectedDate(parseFormattedInput(formatNumericInput(raw)));
  }

  // ── Raccourcis ──────────────────────────────────────────────────────────
  function handleShortcut(shortcut: Shortcut, index: number) {
    const iso = addDaysToToday(shortcut.days);
    setActiveShortcut(index);
    setSelectedDate(iso);
    const [y, m, d] = iso.split("-");
    setDigits(`${d}${m}${y}`);
  }

  // ── Confirmation ────────────────────────────────────────────────────────
  function handleConfirm() {
    if (selectedDate) {
      onCapture(selectedDate);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Raccourcis temporels */}
      <div>
        <p className="mb-2 text-xs font-medium text-gray-500 dark:text-zinc-400">
          Raccourcis rapides
        </p>
        <div className="flex flex-wrap gap-2">
          {SHORTCUTS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => handleShortcut(s, i)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                activeShortcut === i
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-green-400 hover:text-green-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-green-500"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Séparateur */}
      <div className="flex items-center gap-3">
        <hr className="flex-1 border-gray-200 dark:border-zinc-700" />
        <span className="text-xs text-gray-400">ou</span>
        <hr className="flex-1 border-gray-200 dark:border-zinc-700" />
      </div>

      {/* Champ numérique formaté */}
      <div>
        <p className="mb-2 text-xs font-medium text-gray-500 dark:text-zinc-400">
          Saisir la date (JJ/MM/AA ou JJ/MM/AAAA)
        </p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <CalendarDays
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              inputMode="numeric"
              value={displayValue}
              onChange={handleInputChange}
              placeholder="JJ/MM/AA"
              maxLength={10}
              className={`w-full rounded-lg border py-2.5 pl-9 pr-3 font-mono text-sm tracking-widest outline-none transition-colors focus:ring-2 focus:ring-green-500 dark:bg-zinc-800 dark:text-zinc-100 ${
                digits.length >= 6 && !parsedFromField
                  ? "border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-900/20"
                  : parsedFromField
                    ? "border-green-400 bg-green-50 dark:border-green-600 dark:bg-green-900/20"
                    : "border-gray-200 bg-white dark:border-zinc-700"
              }`}
            />
          </div>
        </div>
        {/* Aperçu lisible */}
        {parsedFromField && (
          <p className="mt-1.5 text-xs text-green-700 dark:text-green-400">
            {isoToDisplay(parsedFromField)}
          </p>
        )}
        {digits.length >= 6 && !parsedFromField && (
          <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
            Date invalide — format attendu : JJ/MM/AA
          </p>
        )}
      </div>

      {/* Bouton de confirmation */}
      {selectedDate && (
        <button
          onClick={handleConfirm}
          className="flex items-center justify-center gap-2 rounded-full bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700"
        >
          <Check size={16} />
          Valider le {isoToDisplay(selectedDate)}
        </button>
      )}
    </div>
  );
}
