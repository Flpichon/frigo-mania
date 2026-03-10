"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { joinHousehold } from "@/app/(auth)/settings/actions";

type Status = "loading" | "success" | "error" | "unauthenticated";

const ERROR_MESSAGES: Record<string, string> = {
  "404": "Ce lien d'invitation est invalide ou n'existe pas.",
  "400": "Ce lien d'invitation a expiré.",
  "409": "Vous êtes déjà membre de ce foyer (ou le lien a déjà été utilisé).",
};

function parseApiError(message: string): string {
  for (const [code, label] of Object.entries(ERROR_MESSAGES)) {
    if (message.includes(`API error ${code}`)) {
      return label;
    }
  }
  return "Une erreur est survenue. Veuillez réessayer.";
}

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();

  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const inviteToken = searchParams.get("token");

  useEffect(() => {
    if (sessionStatus === "loading") {
      return;
    }

    if (sessionStatus === "unauthenticated") {
      // Redirige vers Keycloak en conservant l'URL de retour
      signIn("keycloak", { callbackUrl: `/join?token=${inviteToken ?? ""}` });
      return;
    }

    if (!inviteToken) {
      setErrorMessage("Aucun token d'invitation trouvé dans le lien.");
      setStatus("error");
      return;
    }

    const authToken = session?.accessToken;
    if (!authToken) {
      setErrorMessage("Session invalide. Veuillez vous reconnecter.");
      setStatus("error");
      return;
    }

    joinHousehold(inviteToken, authToken)
      .then(() => {
        setStatus("success");
        setTimeout(() => router.replace("/products"), 2000);
      })
      .catch((e: Error) => {
        setErrorMessage(parseApiError(e.message));
        setStatus("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, session]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-zinc-950">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-sm dark:bg-zinc-900">
        {(status === "loading" || sessionStatus === "loading") && (
          <>
            <Loader2 size={40} className="animate-spin text-green-600" />
            <p className="text-center text-sm text-gray-500 dark:text-zinc-400">
              Rejoindre le foyer…
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle size={40} className="text-green-600" />
            <div className="text-center">
              <p className="font-semibold text-gray-900 dark:text-zinc-100">
                Vous avez rejoint le foyer !
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                Redirection en cours…
              </p>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle size={40} className="text-red-500" />
            <div className="text-center">
              <p className="font-semibold text-gray-900 dark:text-zinc-100">
                Invitation invalide
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                {errorMessage}
              </p>
            </div>
            <button
              onClick={() => router.replace("/products")}
              className="mt-2 rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              Retour à l&apos;accueil
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950">
          <Loader2 size={40} className="animate-spin text-green-600" />
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}

