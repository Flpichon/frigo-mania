"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";
import type { Household } from "@/types";

interface HouseholdContextValue {
  household: Household | null;
  households: Household[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  /** Sélectionner manuellement un foyer parmi ceux disponibles */
  selectHousehold: (id: string) => void;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const token = session?.accessToken;

  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHouseholds = useCallback(async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Household[]>("/households", { token });
      setHouseholds(data);
      // Auto-select le premier foyer si aucun n'est encore sélectionné
      setSelectedId((prev) => (data.length > 0 && !prev ? data[0]._id : prev));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchHouseholds();
    }
  }, [status, fetchHouseholds]);

  const household = households.find((h) => h._id === selectedId) ?? null;

  return (
    <HouseholdContext.Provider
      value={{
        household,
        households,
        loading,
        error,
        refetch: fetchHouseholds,
        selectHousehold: setSelectedId,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext);
  if (!ctx) {
    throw new Error("useHousehold must be used within a HouseholdProvider");
  }
  return ctx;
}
