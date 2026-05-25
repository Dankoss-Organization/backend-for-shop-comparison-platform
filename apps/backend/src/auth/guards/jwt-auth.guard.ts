import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { BetterAuthService } from "../better-auth.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly betterAuth: BetterAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    let token: string | undefined;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }

    const user = await this.betterAuth.validateToken(token);
    if (user) {
      req.user = user;
    } else {
      // Fallback to development user id to keep existing behaviour
      req.user = { id: process.env.DEV_USER_ID || "dev_user" };
    }

    return true;
  }
}
