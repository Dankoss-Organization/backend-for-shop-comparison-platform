import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BetterAuthService } from "./better-auth.service";

@Injectable()
export class AuthService {
  private readonly providerId = process.env.BETTER_AUTH_PROVIDER_ID || "better-auth";

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
        const user = await this.prisma.user.findUnique({ where: { id: account.userId } });
        if (user) return user;
      }
    }

    // Create a new user when we have at least an account id or email
    const emailForNew = email ?? (accountId ? `${accountId}@${this.providerId}.local` : null);
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
}
