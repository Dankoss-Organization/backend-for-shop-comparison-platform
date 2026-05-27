import {
  Controller,
  Get,
  Post,
  Req,
  Body,
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
}
