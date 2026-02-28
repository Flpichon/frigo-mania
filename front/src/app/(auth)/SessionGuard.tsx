"use client";

import { useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

/** Intervalle de vérification de la session Keycloak (ms). */
const POLL_INTERVAL_MS = 60_000;

/**
 * Vérifie activement la validité de la session Keycloak :
 * 1. Si NextAuth a marqué une erreur de refresh → reconnexion immédiate.
 * 2. Toutes les 60 s, appel au /userinfo Keycloak avec l'access token.
 *    Si Keycloak répond 401 (session détruite), on déconnecte l'utilisateur.
 */
export default function SessionGuard() {
  const { data: session } = useSession();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cas 1 — erreur de refresh détectée par NextAuth
  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      signIn("keycloak");
    }
  }, [session]);

  // Cas 2 — polling userinfo
  useEffect(() => {
    const accessToken = session?.accessToken;
    const userinfoEndpoint = session?.userinfoEndpoint;

    if (!accessToken || !userinfoEndpoint) {
      return;
    }

    const check = async () => {
      try {
        const res = await fetch(userinfoEndpoint, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.status === 401) {
          await signOut({ redirect: false });
          signIn("keycloak");
        }
      } catch {
        // Erreur réseau transitoire — on ne déconnecte pas
      }
    };

    intervalRef.current = setInterval(check, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session]);

  return null;
}
