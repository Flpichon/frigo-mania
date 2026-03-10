import "@auth/core/types";
import "next-auth/jwt";

declare module "@auth/core/types" {
  interface Session {
    accessToken?: string;
    error?: string;
    userId?: string;
    username?: string | null;
    userinfoEndpoint?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    accessToken?: string;
    accessTokenExpires?: number;
    refreshToken?: string;
    username?: string | null;
    error?: string;
  }
}
