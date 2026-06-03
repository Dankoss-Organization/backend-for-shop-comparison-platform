import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { BetterAuthService } from "./better-auth.service";
import * as bcrypt from "bcrypt";

describe("AuthService - Security Endpoints", () => {
  let authService: AuthService;
  let prismaService: PrismaService;

  const mockUserId = "test-user-id";
  const testPassword = "TestPassword123";
  const hashedPassword =
    "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm"; // hashed "password"

  const mockUser = {
    id: mockUserId,
    email: "test@example.com",
    name: "Test User",
    password: hashedPassword,
  };

  const mockSession = {
    id: "session-id-1",
    token: "test-token",
    userId: mockUserId,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            session: {
              findMany: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: BetterAuthService,
          useValue: {},
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe("changePassword", () => {
    it("should change password successfully with correct current password", async () => {
      const newPassword = "NewPassword123";
      const updatedUser = { ...mockUser, password: "new-hashed-password" };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue(updatedUser);

      jest
        .spyOn(bcrypt, "compare")
        .mockImplementation(() => Promise.resolve(true as never));
      jest
        .spyOn(bcrypt, "hash")
        .mockImplementation(() =>
          Promise.resolve("new-hashed-password" as never),
        );

      const result = await authService.changePassword(
        mockUserId,
        "password",
        newPassword,
      );

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
      });
      expect(bcrypt.compare).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(result).toEqual(updatedUser);
    });

    it("should throw UnauthorizedException when current password is incorrect", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, "compare")
        .mockImplementation(() => Promise.resolve(false as never));

      await expect(
        authService.changePassword(
          mockUserId,
          "wrongpassword",
          "NewPassword123",
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException when user has no password set", async () => {
      const userNoPassword = { ...mockUser, password: null };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        userNoPassword,
      );

      await expect(
        authService.changePassword(mockUserId, "password", "NewPassword123"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException when user does not exist", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.changePassword(mockUserId, "password", "NewPassword123"),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("getUserSessions", () => {
    it("should return all active sessions for a user", async () => {
      const sessions = [mockSession, { ...mockSession, id: "session-id-2" }];

      (prismaService.session.findMany as jest.Mock).mockResolvedValue(sessions);

      const result = await authService.getUserSessions(mockUserId);

      expect(prismaService.session.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual(sessions);
      expect(result).toHaveLength(2);
    });

    it("should return empty array when user has no sessions", async () => {
      (prismaService.session.findMany as jest.Mock).mockResolvedValue([]);

      const result = await authService.getUserSessions(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe("deleteSessionById", () => {
    it("should delete a session by id", async () => {
      (prismaService.session.delete as jest.Mock).mockResolvedValue(
        mockSession,
      );

      const result = await authService.deleteSessionById(mockSession.id);

      expect(prismaService.session.delete).toHaveBeenCalledWith({
        where: { id: mockSession.id },
      });
      expect(result).toEqual(mockSession);
    });

    it("should throw error when session does not exist", async () => {
      const errorMessage = "Session not found";
      (prismaService.session.delete as jest.Mock).mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        authService.deleteSessionById("non-existent-id"),
      ).rejects.toThrow(errorMessage);
    });
  });
});
