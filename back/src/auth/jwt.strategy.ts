import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';

export interface KeycloakTokenPayload {
  sub: string;
  email?: string;
  preferred_username?: string;
  realm_access?: { roles: string[] };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private config: ConfigService) {
    const authServerUrl = config.get<string>('KEYCLOAK_AUTH_SERVER_URL');
    const realm = config.get<string>('KEYCLOAK_REALM');

    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${authServerUrl}/realms/${realm}/protocol/openid-connect/certs`,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: config.get<string>('KEYCLOAK_BACKEND_CLIENT_ID'),
      issuer: `${authServerUrl}/realms/${realm}`,
      algorithms: ['RS256'],
    });
  }

  validate(payload: KeycloakTokenPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException();
    }
    return {
      userId: payload.sub,
      email: payload.email,
      username: payload.preferred_username,
      roles: payload.realm_access?.roles ?? [],
    };
  }
}
