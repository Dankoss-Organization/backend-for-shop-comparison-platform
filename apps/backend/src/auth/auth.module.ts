import { Module } from "@nestjs/common";
import { BetterAuthModule } from "./better-auth.module";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./guards/auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { Reflector } from "@nestjs/core";

@Module({
  imports: [BetterAuthModule],
  controllers: [AuthController],
  providers: [JwtAuthGuard, AuthService, AuthGuard, RolesGuard, Reflector],
  exports: [JwtAuthGuard, AuthGuard, RolesGuard, BetterAuthModule, AuthService],
})
export class AuthModule {}
