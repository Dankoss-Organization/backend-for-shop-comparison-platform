import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class BetterAuthService {
  private readonly devFallbackUserId: string;
  private readonly apiUrl?: string;
  private readonly apiKey?: string;

  constructor(private config: ConfigService) {
    this.devFallbackUserId = this.config.get<string>("DEV_USER_ID") || "dev_user";
    this.apiUrl = this.config.get<string>("BETTER_AUTH_API_URL");
    this.apiKey = this.config.get<string>("BETTER_AUTH_API_KEY");
  }

  /**
   * Validate a raw token and return a user payload or null.
   * If `BETTER_AUTH_API_URL` is set, the service will POST `{ token }` to that URL
   * with `Authorization: Bearer <BETTER_AUTH_API_KEY>` header. The expected
   * response is a JSON payload containing either `{ active: boolean, ... }`
   * or a user-like object `{ id, email, name, roles }`.
   * If no API URL is configured, falls back to a simple dev-friendly mapping.
   */
  async validateToken(token?: string): Promise<Record<string, any> | null> {
    if (!token) return null;

    // Development-friendly short token -> user id mapping
    if (/^[a-zA-Z0-9_-]{4,64}$/.test(token) && !this.apiUrl) {
      return { id: token };
    }

    if (!this.apiUrl) return null;

    try {
      // Call configured introspection/verification endpoint. The caller should
      // configure `BETTER_AUTH_API_URL` to point to the provider introspect route.
      const fetchFn = (globalThis as any).fetch;
      if (typeof fetchFn !== "function") return null;
      const res = await fetchFn(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) return null;
      const data = await res.json();

      // If the provider returns an `active` flag, require it to be true.
      if (typeof data.active === "boolean") {
        if (!data.active) return null;
        return data;
      }

      // Otherwise, accept any object containing an `id` or `email`.
      if (data && (data.id || data.email)) return data;

      return null;
    } catch (err) {
      // On error, do not expose details — just fallback to null
      return null;
    }
  }
}

