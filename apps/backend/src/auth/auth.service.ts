import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BetterAuthService } from "./better-auth.service";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";

const DEFAULT_SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS ?? 30);

@Injectable()
export class AuthService {
  private readonly providerId =
    process.env.BETTER_AUTH_PROVIDER_ID || "better-auth";

  constructor(
    private readonly prisma: PrismaService,
    private readonly betterAuth: BetterAuthService,
  ) {}

  /**
   * Validate a bearer token and return a `User` record, creating one if needed.
   * Returns null when token is invalid.
   */
  async validateTokenAndGetUser(token?: string) {
    const payload = await this.betterAuth.validateToken(token);
    if (!payload) return null;

    // If payload contains email, prefer lookup by email
    const email = (payload as any).email as string | undefined;
    const accountId = (payload as any).id as string | undefined;

    if (email) {
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing) return existing;
    }

    if (accountId) {
      const account = await this.prisma.account.findFirst({
        where: { accountId, providerId: this.providerId },
      });
      if (account) {
        const user = await this.prisma.user.findUnique({
          where: { id: account.userId },
        });
        if (user) return user;
      }
    }

    // Create a new user when we have at least an account id or email
    const emailForNew =
      email ?? (accountId ? `${accountId}@${this.providerId}.local` : null);
    if (!emailForNew) return null;

    const name = (payload as any).name ?? "";

    const user = await this.prisma.user.create({
      data: {
        email: emailForNew,
        name: name || emailForNew,
      },
    });

    if (accountId) {
      await this.prisma.account.create({
        data: {
          accountId,
          providerId: this.providerId,
          userId: user.id,
        },
      });
    }

    return user;
  }

  /** Create a session record for a validated token */
  async createSessionForToken(
    userId: string,
    token: string,
    ipAddress?: string,
    userAgent?: string,
    expiresAt?: Date,
  ) {
    const ttl =
      expiresAt ??
      new Date(Date.now() + DEFAULT_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
    return this.prisma.session.create({
      data: {
        token,
        userId,
        expiresAt: ttl,
        ipAddress,
        userAgent,
      },
    });
  }

  /** Revoke session by token */
  async revokeSession(token: string) {
    return this.prisma.session.deleteMany({ where: { token } });
  }

  /** Find a user by session token */
  async getUserBySessionToken(token: string) {
    const session = await this.prisma.session.findUnique({ where: { token } });
    if (!session) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });
    return user;
  }

  /** Register a new user with email/password */
  async registerWithEmail(email: string, password: string, name?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing)
      throw new ConflictException("User with this email already exists");

    const hashed = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashed,
        name: name || email,
      },
    });

    return user;
  }

  /** Authenticate user by email/password and create a session token */
  async authenticateWithEmail(
    email: string,
    password: string,
    ip?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) throw new UnauthorizedException();

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException();

    // Create a random token and session
    const token = randomBytes(48).toString("hex");
    await this.createSessionForToken(user.id, token, ip, userAgent);

    return { user, token };
  }
}
