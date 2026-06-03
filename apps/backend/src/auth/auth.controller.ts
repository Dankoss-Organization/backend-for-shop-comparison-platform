import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Req,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { GetUser } from "./core/get-user.decorator";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { Public } from "./core/public.decorator";
import { SignUpDto } from "./dto/sign-up.dto";
import { SignInDto } from "./dto/sign-in.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Sign up with email/password
  @Public()
  @Post("/signup")
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() body: SignUpDto) {
    const user = await this.authService.registerWithEmail(
      body.email,
      body.password,
      body.name,
    );
    return { user };
  }

  // Sign in with email/password -> returns a session token
  @Public()
  @Post("/signin")
  @HttpCode(HttpStatus.OK)
  async signIn(@Req() req: any, @Body() body: SignInDto) {
    const ip = req.ip;
    const userAgent = req.headers["user-agent"] as string | undefined;
    const { user, token } = await this.authService.authenticateWithEmail(
      body.email,
      body.password,
      ip,
      userAgent,
    );
    return { user, token };
  }

  // Verify a bearer token and create a session
  @Public()
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

    await this.authService.createSessionForToken(
      user.id,
      token ?? "",
      req.ip,
      req.headers["user-agent"] as string,
    );

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

  // Change password with verification of current password
  @Put("/change-password")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@GetUser() user: any, @Body() body: ChangePasswordDto) {
    await this.authService.changePassword(
      user.id,
      body.currentPassword,
      body.newPassword,
    );
    return { message: "Password changed successfully" };
  }

  // Get all active sessions for current user
  @Get("/sessions")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getSessions(@GetUser() user: any) {
    const sessions = await this.authService.getUserSessions(user.id);
    return { sessions };
  }

  // Delete a specific session
  @Delete("/sessions/:id")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteSession(@Param("id") sessionId: string, @GetUser() user: any) {
    // Verify that the session belongs to the current user
    const session = await this.authService.getUserSessions(user.id);
    if (!session.find((s) => s.id === sessionId)) {
      throw new UnauthorizedException(
        "Session not found or does not belong to this user",
      );
    }
    await this.authService.deleteSessionById(sessionId);
    return { message: "Session terminated successfully" };
  }
}
