import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface KeycloakUserProfile {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface CachedToken {
  value: string;
  expiresAt: number;
}

interface KeycloakTokenResponse {
  access_token: string;
  expires_in: number;
}

interface KeycloakUserResponse {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

/**
 * Service qui s'authentifie auprès de Keycloak via client_credentials
 * et expose une méthode pour résoudre un userId en profil utilisateur.
 *
 * Prérequis Keycloak :
 *   - Client `frigo-mania-admin` : Client authentication ON, Service accounts ON
 *   - Service account du client : rôle `view-users` de `realm-management`
 */
@Injectable()
export class KeycloakAdminService {
  private readonly logger = new Logger(KeycloakAdminService.name);
  private cachedToken: CachedToken | null = null;

  private readonly tokenUrl: string;
  private readonly adminUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(private readonly config: ConfigService) {
    const base = config.get<string>('KEYCLOAK_AUTH_SERVER_URL')!;
    const realm = config.get<string>('KEYCLOAK_REALM')!;
    this.tokenUrl = `${base}/realms/${realm}/protocol/openid-connect/token`;
    this.adminUrl = `${base}/admin/realms/${realm}`;
    this.clientId = config.get<string>('KEYCLOAK_ADMIN_CLIENT_ID')!;
    this.clientSecret = config.get<string>('KEYCLOAK_ADMIN_CLIENT_SECRET')!;
  }

  /** Retourne un access_token valide (depuis le cache ou un nouveau). */
  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.value;
    }

    const res = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Keycloak token error: ${body}`);
      throw new Error("Impossible d'obtenir un token admin Keycloak");
    }

    const data = (await res.json()) as KeycloakTokenResponse;
    // Garder 30 s de marge avant l'expiration réelle
    this.cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 30) * 1000,
    };

    return this.cachedToken.value;
  }

  /** Résout un userId Keycloak en profil utilisateur. */
  async getUserById(userId: string): Promise<KeycloakUserProfile | null> {
    try {
      const token = await this.getAccessToken();
      console.log("🚀 ~ keycloak-admin.service.ts:93 ~ KeycloakAdminService ~ getUserById ~ token:", token);
      const res = await fetch(`${this.adminUrl}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log(res);

      if (res.status === 404) {
        return null;
      }

      if (!res.ok) {
        this.logger.warn(`Keycloak user lookup failed for ${userId}: ${res.status}`);
        return null;
      }

      const user = (await res.json()) as KeycloakUserResponse;
      return {
        id: user.id,
        username: user.username,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        email: user.email ?? undefined,
      };
    } catch (err) {
      this.logger.warn(`getUserById error for ${userId}: ${(err as Error).message}`);
      return null;
    }
  }

  /** Résout plusieurs userIds en parallèle. */
  async getUsersByIds(userIds: string[]): Promise<KeycloakUserProfile[]> {
    const results = await Promise.all(userIds.map((id) => this.getUserById(id)));
    return results.filter((u): u is KeycloakUserProfile => u !== null);
  }
}
