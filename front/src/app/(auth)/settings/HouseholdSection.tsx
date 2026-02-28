"use client";

import { useState, useEffect } from "react";
import { Pencil, Copy, Check, Loader2 } from "lucide-react";
import { Section } from "./ui";
import { renameHousehold, generateInviteToken } from "./actions";
import type { Household } from "@/types";

interface Props {
  household: Household;
  isOwner: boolean;
  token: string;
  onRenamed: () => void;
}

export function HouseholdSection({ household, isOwner, token, onRenamed }: Props) {
  const [editName, setEditName] = useState(false);
  const [nameValue, setNameValue] = useState(household.name);
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setNameValue(household.name);
  }, [household.name]);

  const handleRename = async () => {
    setRenameLoading(true);
    setRenameError(null);
    try {
      await renameHousehold(household._id, nameValue, token);
      await onRenamed();
      setEditName(false);
    } catch (e) {
      setRenameError((e as Error).message);
    } finally {
      setRenameLoading(false);
    }
  };

  const handleGenerateInvite = async () => {
    setInviteLoading(true);
    try {
      const t = await generateInviteToken(household._id, token);
      setInviteToken(t);
    } catch {
      // silently ignore
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInvite = () => {
    if (!inviteToken) {
      return;
    }
    const url = `${window.location.origin}/join?token=${inviteToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Section title="Foyer" icon={<Pencil size={16} />}>
      <div className="flex items-center justify-between">
        {editName ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <button
              onClick={handleRename}
              disabled={renameLoading || !nameValue.trim()}
              className="rounded-full bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {renameLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                "OK"
              )}
            </button>
            <button
              onClick={() => {
                setEditName(false);
                setRenameError(null);
              }}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Annuler
            </button>
          </div>
        ) : (
          <>
            <span className="font-semibold text-gray-800 dark:text-zinc-200">
              {household.name}
            </span>
            {isOwner && (
              <button
                onClick={() => setEditName(true)}
                className="ml-2 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                aria-label="Renommer le foyer"
              >
                <Pencil size={14} />
              </button>
            )}
          </>
        )}
      </div>

      {renameError && <p className="text-xs text-red-500">{renameError}</p>}

      {isOwner && (
        <div className="mt-3 border-t pt-3 dark:border-zinc-700">
          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-zinc-400">
            Lien d&apos;invitation (valable 48h)
          </p>
          {inviteToken ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-gray-100 px-2 py-1 text-xs dark:bg-zinc-800">
                {`${typeof window !== "undefined" ? window.location.origin : ""}/join?token=${inviteToken}`}
              </code>
              <button
                onClick={handleCopyInvite}
                className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
                aria-label="Copier"
              >
                {copied ? (
                  <Check size={14} className="text-green-600" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateInvite}
              disabled={inviteLoading}
              className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 dark:bg-green-900/20 dark:text-green-400"
            >
              {inviteLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : null}
              Générer un lien
            </button>
          )}
        </div>
      )}
    </Section>
  );
}
