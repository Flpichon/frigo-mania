"use client";

// Composants UI partagés dans la page settings

import { Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------
export function Section({
  title,
  icon,
  children,
  danger = false,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl bg-white p-4 shadow-sm ring-1 dark:bg-zinc-900 ${
        danger
          ? "ring-red-200 dark:ring-red-800"
          : "ring-gray-100 dark:ring-zinc-800"
      }`}
    >
      <div
        className={`mb-3 flex items-center gap-2 text-sm font-semibold ${
          danger
            ? "text-red-600 dark:text-red-400"
            : "text-gray-700 dark:text-zinc-200"
        }`}
      >
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bouton zone de danger
// ---------------------------------------------------------------------------
export function DangerButton({
  label,
  icon,
  onClick,
  loading,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}
