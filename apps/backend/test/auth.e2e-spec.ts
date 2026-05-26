import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { AuthController } from "../src/auth/auth.controller";
import { AuthService } from "../src/auth/auth.service";
import { LoggerModule } from "../src/logger/logger.module";

describe("AuthController (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const token = "dev_user";
  let createdUserId: string | null = null;

  beforeAll(async () => {
    // In-memory mock for AuthService behaviour (no real DB needed)
    const users = new Map<string, any>();
    const sessions = new Map<string, any>();
    const accounts = new Map<string, any>();

    const mockAuthService: Partial<AuthService> = {
      validateTokenAndGetUser: async (token?: string) => {
        if (!token) return null;
        // dev fallback: token is user id
        const accountId = token;
        // find existing account
        for (const a of accounts.values()) {
          if (a.accountId === accountId) return users.get(a.userId) ?? null;
        }
        // create user
        const id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const user = { id, email: `${accountId}@better-auth.local`, name: accountId };
        users.set(id, user);
        const accId = `acc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        accounts.set(accId, { id: accId, accountId, providerId: 'better-auth', userId: id });
        return user;
      },
      createSessionForToken: async (userId: string, token: string, ip?: string, ua?: string) => {
        const id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const s = { id, token, userId, ipAddress: ip, userAgent: ua, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) };
        sessions.set(token, s);
        return s;
      },
      getUserBySessionToken: async (token: string) => {
        const s = sessions.get(token);
        if (!s) return null;
        return users.get(s.userId) ?? null;
      },
      revokeSession: async (token: string) => {
        sessions.delete(token);
        return { count: 1 } as any;
      },
    } as any;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        // JwtAuthGuard will be injected with our mock AuthService
        (await import("../src/auth/guards/jwt-auth.guard")).JwtAuthGuard,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // expose a minimal Prisma-like facade for cleanup expectations in the test
    prisma = {
      session: {
        deleteMany: async ({ where }: any) => {
          if (where?.token) sessions.delete(where.token);
          if (where?.userId) {
            for (const [k, s] of sessions.entries()) if (s.userId === where.userId) sessions.delete(k);
          }
          return { count: 0 } as any;
        },
        findUnique: async ({ where }: any) => sessions.get(where.token) ?? null,
      },
      account: {
        deleteMany: async ({ where }: any) => {
          for (const [k, a] of accounts.entries()) if (a.userId === where.userId) accounts.delete(k);
          return { count: 0 } as any;
        },
      },
      user: {
        deleteMany: async ({ where }: any) => {
          if (where?.id) users.delete(where.id);
          return { count: 0 } as any;
        },
      },
    } as any;
  });

  afterAll(async () => {
    if (createdUserId) {
      await prisma.session.deleteMany({ where: { userId: createdUserId } });
      await prisma.account.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
    } else {
      // ensure no stray sessions with the token
      await prisma.session.deleteMany({ where: { token } });
    }

    await app.close();
  });

  it("verify -> me -> logout flow", async () => {
    // Verify (creates user + session)
    const verifyRes = await request(app.getHttpServer())
      .post("/auth/verify")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(verifyRes.body).toHaveProperty("user");
    const user = verifyRes.body.user;
    expect(user).toHaveProperty("id");
    createdUserId = user.id;

    // Get current user using same token
    const meRes = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(meRes.body).toHaveProperty("user");
    expect(meRes.body.user.id).toBe(createdUserId);

    // Logout
    await request(app.getHttpServer())
      .post("/auth/logout")
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    // After logout, protected endpoint still returns user via provider fallback
    const meAfterLogout = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(meAfterLogout.body.user.id).toBe(createdUserId);

    // Ensure session removed from DB
    const session = await prisma.session.findUnique({ where: { token } });
    expect(session).toBeNull();
  });
});
