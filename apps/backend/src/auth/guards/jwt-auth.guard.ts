import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    // Temporary stub: if Authorization header is "Bearer <id>" use that as user id,
    // otherwise fallback to a development user id.
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      req.user = { id: token || "dev_user" };
    } else {
      req.user = { id: "dev_user" };
    }

    return true;
  }
}
