import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController - Security Endpoints", () => {
  let authController: AuthController;
  let authService: AuthService;

  const mockUserId = "test-user-id";
  const mockUser = {
    id: mockUserId,
    email: "test@example.com",
    name: "Test User",
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
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            changePassword: jest.fn(),
            getUserSessions: jest.fn(),
            deleteSessionById: jest.fn(),
          },
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe("PUT /auth/change-password", () => {
    it("should change password successfully", async () => {
      const changePasswordDto = {
        currentPassword: "OldPassword123",
        newPassword: "NewPassword123",
      };

      (authService.changePassword as jest.Mock).mockResolvedValue({
        ...mockUser,
        password: "new-hashed-password",
      });

      const result = await authController.changePassword(
        mockUser,
        changePasswordDto,
      );

      expect(authService.changePassword).toHaveBeenCalledWith(
        mockUserId,
        changePasswordDto.currentPassword,
        changePasswordDto.newPassword,
      );
      expect(result).toEqual({ message: "Password changed successfully" });
    });

    it("should throw error for incorrect current password", async () => {
      const changePasswordDto = {
        currentPassword: "WrongPassword",
        newPassword: "NewPassword123",
      };

      (authService.changePassword as jest.Mock).mockRejectedValue(
        new UnauthorizedException("Current password is incorrect"),
      );

      await expect(
        authController.changePassword(mockUser, changePasswordDto),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("GET /auth/sessions", () => {
    it("should return all sessions for current user", async () => {
      const sessions = [
        mockSession,
        { ...mockSession, id: "session-id-2", ipAddress: "192.168.1.2" },
      ];

      (authService.getUserSessions as jest.Mock).mockResolvedValue(sessions);

      const result = await authController.getSessions(mockUser);

      expect(authService.getUserSessions).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual({ sessions });
      expect(result.sessions).toHaveLength(2);
    });

    it("should return empty sessions list", async () => {
      (authService.getUserSessions as jest.Mock).mockResolvedValue([]);

      const result = await authController.getSessions(mockUser);

      expect(result).toEqual({ sessions: [] });
    });
  });

  describe("DELETE /auth/sessions/:id", () => {
    it("should delete a session successfully", async () => {
      const sessionId = "session-id-1";
      const sessions = [mockSession];

      (authService.getUserSessions as jest.Mock).mockResolvedValue(sessions);
      (authService.deleteSessionById as jest.Mock).mockResolvedValue(
        mockSession,
      );

      const result = await authController.deleteSession(sessionId, mockUser);

      expect(authService.getUserSessions).toHaveBeenCalledWith(mockUserId);
      expect(authService.deleteSessionById).toHaveBeenCalledWith(sessionId);
      expect(result).toEqual({ message: "Session terminated successfully" });
    });

    it("should throw error when session does not belong to user", async () => {
      const sessionId = "non-existent-session-id";
      const sessions = [mockSession];

      (authService.getUserSessions as jest.Mock).mockResolvedValue(sessions);

      await expect(
        authController.deleteSession(sessionId, mockUser),
      ).rejects.toThrow(UnauthorizedException);

      expect(authService.deleteSessionById).not.toHaveBeenCalled();
    });

    it("should throw error when user has no sessions", async () => {
      const sessionId = "session-id-1";

      (authService.getUserSessions as jest.Mock).mockResolvedValue([]);

      await expect(
        authController.deleteSession(sessionId, mockUser),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
