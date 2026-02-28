"use client";

import { useState } from "react";
import { Trash2, LogOut } from "lucide-react";
import { Section, DangerButton } from "./ui";
import { leaveHousehold, deleteHousehold } from "./actions";
import type { Household } from "@/types";

interface Props {
  household: Household;
  isOwner: boolean;
  currentUserId: string;
  token: string;
  onAction: () => void;
}

export function DangerSection({
  household,
  isOwner,
  currentUserId,
  token,
  onAction,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleLeave = async () => {
    if (!confirm("Quitter ce foyer ?")) {
      return;
    }
    setLoading(true);
    try {
      await leaveHousehold(household._id, currentUserId, token);
      await onAction();
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Supprimer définitivement le foyer "${household.name}" ?`)) {
      return;
    }
    setLoading(true);
    try {
      await deleteHousehold(household._id, token);
      await onAction();
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section title="Zone de danger" icon={<Trash2 size={16} />} danger>
      <div className="flex flex-col gap-2">
        {!isOwner && (
          <DangerButton
            label="Quitter ce foyer"
            icon={<LogOut size={14} />}
            onClick={handleLeave}
            loading={loading}
          />
        )}
        {isOwner && (
          <DangerButton
            label="Supprimer ce foyer"
            icon={<Trash2 size={14} />}
            onClick={handleDelete}
            loading={loading}
          />
        )}
      </div>
    </Section>
  );
}
