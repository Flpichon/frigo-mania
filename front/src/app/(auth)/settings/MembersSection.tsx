"use client";

import { useState, useEffect } from "react";
import { Users, Crown, UserMinus, Loader2 } from "lucide-react";
import { Section } from "./ui";
import { fetchMembers, removeMember } from "./actions";
import type { Household, HouseholdMember } from "@/types";

interface Props {
  household: Household;
  isOwner: boolean;
  currentUserId: string;
  token: string;
  onMemberRemoved: () => void;
}

function memberDisplayName(m: HouseholdMember): string {
  const full = [m.firstName, m.lastName].filter(Boolean).join(" ");
  return full || m.username;
}

export function MembersSection({
  household,
  isOwner,
  currentUserId,
  token,
  onMemberRemoved,
}: Props) {
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  useEffect(() => {
    setLoadingProfiles(true);
    fetchMembers(household._id, token)
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setLoadingProfiles(false));
  }, [household._id, household.memberIds.length, token]);

  const handleRemoveMember = async (memberId: string) => {
    setRemovingMember(memberId);
    try {
      await removeMember(household._id, memberId, token);
      await onMemberRemoved();
    } catch {
      // silently ignore
    } finally {
      setRemovingMember(null);
    }
  };

  const canRemove = (memberId: string) =>
    memberId !== household.ownerId &&
    (isOwner || memberId === currentUserId);

  // Construit une map id → profil pour lookup O(1)
  const profileMap = new Map(members.map((m) => [m.id, m]));

  return (
    <Section title="Membres" icon={<Users size={16} />}>
      {loadingProfiles ? (
        <div className="flex justify-center py-3">
          <Loader2 size={18} className="animate-spin text-gray-400" />
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {household.memberIds.map((memberId) => {
            const profile = profileMap.get(memberId);
            return (
              <li key={memberId} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-col">
                  <div className="flex items-center gap-1.5">
                    {memberId === household.ownerId && (
                      <Crown size={13} className="shrink-0 text-amber-500" />
                    )}
                    <span className="truncate text-sm font-medium text-gray-800 dark:text-zinc-100">
                      {profile ? memberDisplayName(profile) : memberId}
                    </span>
                    {memberId === currentUserId && (
                      <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Moi
                      </span>
                    )}
                  </div>
                  {profile?.email && (
                    <span className="truncate text-xs text-gray-400 dark:text-zinc-500">
                      {profile.email}
                    </span>
                  )}
                </div>
                {canRemove(memberId) && (
                  <button
                    onClick={() => handleRemoveMember(memberId)}
                    disabled={removingMember === memberId}
                    className="shrink-0 rounded-full p-1.5 text-red-400 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"
                    aria-label="Retirer"
                  >
                    {removingMember === memberId ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <UserMinus size={14} />
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
