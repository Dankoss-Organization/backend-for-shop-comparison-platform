import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../core/auth.constants";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const userRoles: string[] = (() => {
      if (!user) return [];
      if (Array.isArray(user.roles)) return user.roles;
      if (typeof user.role === "string") return [user.role];
      return [];
    })();

    const allowed = requiredRoles.some((r) => userRoles.includes(r));
    if (!allowed) throw new ForbiddenException("Insufficient role");
    return true;
  }
}
