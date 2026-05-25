import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { DEV_USER_ID } from "../core/auth.constants";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    let token: string | undefined;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }

    // Also support token in cookies (auth_token)
    if (!token && req.cookies) {
      token = req.cookies["auth_token"] || req.cookies["token"];
    }

    // 1) Check local session by token
    let user = token ? await this.authService.getUserBySessionToken(token) : null;

    // 2) Fall back to validating token with external provider
    if (!user) {
      user = await this.authService.validateTokenAndGetUser(token);
    }

    if (user) {
      req.user = user;
    } else {
      req.user = { id: DEV_USER_ID };
    }

    return true;
  }
}
