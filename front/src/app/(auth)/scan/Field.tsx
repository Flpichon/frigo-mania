"use client";

// Champ de formulaire réutilisable dans l'étape de confirmation du scan

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  highlight?: boolean;
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  highlight,
}: FieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-green-500 dark:bg-zinc-800 dark:text-zinc-100 ${
          highlight
            ? "border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/20"
            : "border-gray-200 bg-white dark:border-zinc-700"
        }`}
      />
    </label>
  );
}
