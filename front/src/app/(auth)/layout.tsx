import { BottomNav } from "@/components/BottomNav";
import { HouseholdProvider } from "@/contexts/HouseholdContext";
import SessionGuard from "./SessionGuard";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HouseholdProvider>
      <SessionGuard />
      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-zinc-950">
        {/* Zone de contenu scrollable, avec padding-bottom pour ne pas être masqué par la nav */}
        <main className="flex-1 overflow-y-auto pb-20">
          {/* Contrainte de largeur pour les grands écrans, centré */}
          <div className="mx-auto w-full max-w-lg">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    </HouseholdProvider>
  );
}
