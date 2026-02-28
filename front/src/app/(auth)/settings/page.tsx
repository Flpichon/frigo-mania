"use client";

import { useSession } from "next-auth/react";
import { useHousehold } from "@/contexts/HouseholdContext";
import { AccountSection } from "./AccountSection";
import { HouseholdSection } from "./HouseholdSection";
import { MembersSection } from "./MembersSection";
import { AlertSection } from "./AlertSection";
import { DangerSection } from "./DangerSection";
import { CreateHouseholdSection } from "./CreateHouseholdSection";

export default function SettingsPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const userId = session?.userId ?? undefined;
  const username = session?.username ?? undefined;
  const email = session?.user?.email ?? undefined;

  const { household, refetch } = useHousehold();

  if (!household || !token || !userId) {
    return (
      <main className="flex flex-col gap-6 p-4 pt-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
          Paramètres
        </h1>
        <AccountSection username={username} email={email} />
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <p className="text-gray-400">Aucun foyer trouvé.</p>
          {token && <CreateHouseholdSection token={token} onCreated={refetch} />}
        </div>
      </main>
    );
  }

  const isOwner = household.ownerId === userId;

  return (
    <main className="flex flex-col gap-6 p-4 pt-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
        Paramètres
      </h1>
      <AccountSection username={username} email={email} />
      <HouseholdSection
        household={household}
        isOwner={isOwner}
        token={token}
        onRenamed={refetch}
      />
      <MembersSection
        household={household}
        isOwner={isOwner}
        currentUserId={userId}
        token={token}
        onMemberRemoved={refetch}
      />
      <AlertSection />
      <DangerSection
        household={household}
        isOwner={isOwner}
        currentUserId={userId}
        token={token}
        onAction={refetch}
      />
    </main>
  );
}
