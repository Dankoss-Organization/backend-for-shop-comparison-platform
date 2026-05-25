import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class BetterAuthService {
  private readonly devFallbackUserId: string;

  constructor(private config: ConfigService) {
    this.devFallbackUserId = this.config.get<string>("DEV_USER_ID") || "dev_user";
  }

  /**
   * Validate a raw token and return a user payload or null.
   * Currently supports a simple bearer token -> user id mapping for development
   * and can be extended to call the real Better Auth client.
   */
  async validateToken(token?: string): Promise<{ id: string } | null> {
    if (!token) return null;

    // If token looks like a short id (dev usage), return it as user id
    if (/^[a-zA-Z0-9_-]{4,64}$/.test(token)) {
      return { id: token };
    }

    // TODO: integrate with `better-auth` or remote verification when configured
    return null;
  }
}
