import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../core/auth.constants";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwtAuthGuard: JwtAuthGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const allowed = await this.jwtAuthGuard.canActivate(context);
    return Boolean(allowed);
  }
}
