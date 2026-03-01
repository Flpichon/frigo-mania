import NextAuth from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Profile } from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

interface KeycloakProfile extends Profile {
  preferred_username?: string;
}

interface TokenRefreshResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  error?: string;
}

const KEYCLOAK_TOKEN_URL =
  `${process.env.KEYCLOAK_AUTH_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}` +
  `/protocol/openid-connect/token`;

/**
 * Tente de renouveler le access_token via le refresh_token Keycloak.
 * Retourne le token mis à jour, ou un token marqué `error` si le refresh échoue.
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const response = await fetch(KEYCLOAK_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.KEYCLOAK_CLIENT_ID!,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
        refresh_token: (token.refreshToken ?? "") as string,
      }),
    });

    const refreshed = (await response.json()) as TokenRefreshResponse;

    if (!response.ok) {
      throw new Error(refreshed.error ?? "refresh_failed");
    }

    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error: undefined,
    } as JWT;
  } catch {
    return { ...token, error: "RefreshAccessTokenError" } as JWT;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  // Explicitly configure cookies without __Host- prefix so they work correctly
  // behind nginx-ingress SSL termination (pod receives plain HTTP internally)
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
    },
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
    },
    state: {
      name: "next-auth.state",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
    },
  },
  providers: [
    Keycloak({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer:
        `${process.env.KEYCLOAK_AUTH_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}`,
      checks: ["pkce", "state"],
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Première connexion — on stocke les tokens et l'expiration
      if (account) {
        const keycloakProfile = profile as KeycloakProfile | undefined;
        return {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : Date.now() + (account.expires_in as number) * 1000,
          refreshToken: account.refresh_token,
          username: keycloakProfile?.preferred_username ?? token.email,
        } as JWT;
      }

      // Token encore valide
      if (Date.now() < (token.accessTokenExpires ?? 0)) {
        return token;
      }

      // Token expiré → refresh silencieux
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      if (token.sub) {
        session.userId = token.sub;
      }
      session.username = token.username;
      session.userinfoEndpoint =
        `${process.env.KEYCLOAK_AUTH_SERVER_URL}/realms/` +
        `${process.env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`;
      return session;
    },
  },
});
