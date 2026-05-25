import {
  Controller,
  Get,
  Post,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { GetUser } from "./core/get-user.decorator";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Verify a bearer token and create a session
  @Post("/verify")
  @HttpCode(HttpStatus.OK)
  async verify(@Req() req: any) {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    let token: string | undefined;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }

    const user = await this.authService.validateTokenAndGetUser(token);
    if (!user) throw new UnauthorizedException();

    await this.authService.createSessionForToken(user.id, token ?? "", req.ip, req.headers["user-agent"] as string);

    return { user };
  }

  // Get current authenticated user
  @Get("/me")
  @UseGuards(JwtAuthGuard)
  me(@GetUser() user: any) {
    return { user };
  }

  // Logout: revoke session for current token
  @Post("/logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: any) {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    let token: string | undefined;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }

    if (token) await this.authService.revokeSession(token);
  }
}
