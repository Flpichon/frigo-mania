"use client";

import { signOut } from "next-auth/react";
import { User, LogOut } from "lucide-react";
import { Section } from "./ui";

interface AccountSectionProps {
  username?: string;
  email?: string;
}

export function AccountSection({ username, email }: AccountSectionProps) {
  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <Section title="Compte" icon={<User size={15} />}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          {username && (
            <span className="truncate text-sm font-medium text-gray-800 dark:text-zinc-100">
              {username}
            </span>
          )}
          {email && (
            <span className="truncate text-xs text-gray-500 dark:text-zinc-400">
              {email}
            </span>
          )}
          {!username && !email && (
            <span className="text-xs text-gray-400">Utilisateur connecté</span>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <LogOut size={13} />
          Déconnexion
        </button>
      </div>
    </Section>
  );
}
