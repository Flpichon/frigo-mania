"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createHousehold } from "./actions";

interface Props {
  token: string;
  onCreated: () => void;
}

export function CreateHouseholdSection({ token, onCreated }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createHousehold(name, token);
      onCreated();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full max-w-xs flex-col gap-3">
      <p className="text-sm text-gray-600 dark:text-zinc-400">
        Créez votre premier foyer pour commencer.
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom du foyer"
        className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={handleCreate}
        disabled={loading || !name.trim()}
        className="flex items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        Créer le foyer
      </button>
    </div>
  );
}
