"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Section } from "./ui";

const ALERT_DAYS_KEY = "frigo_alert_days";
const DEFAULT_ALERT_DAYS = 3;
const ALERT_OPTIONS = [1, 2, 3, 5, 7];

function readAlertDays(): number {
  if (typeof window === "undefined") {
    return DEFAULT_ALERT_DAYS;
  }
  const stored = localStorage.getItem(ALERT_DAYS_KEY);
  return stored ? Number(stored) : DEFAULT_ALERT_DAYS;
}

export function AlertSection() {
  const [alertDays, setAlertDays] = useState<number>(readAlertDays);

  const handleChange = (val: number) => {
    setAlertDays(val);
    localStorage.setItem(ALERT_DAYS_KEY, String(val));
  };

  return (
    <Section title="Alertes de péremption" icon={<Bell size={16} />}>
      <p className="text-sm text-gray-500 dark:text-zinc-400">
        Être notifié quand un produit expire dans :
      </p>
      <div className="mt-2 flex items-center gap-3">
        {ALERT_OPTIONS.map((d) => (
          <button
            key={d}
            onClick={() => handleChange(d)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              alertDays === d
                ? "bg-green-600 text-white"
                : "bg-white ring-1 ring-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-zinc-800 dark:ring-zinc-700 dark:text-zinc-300"
            }`}
          >
            {d}j
          </button>
        ))}
      </div>
    </Section>
  );
}
