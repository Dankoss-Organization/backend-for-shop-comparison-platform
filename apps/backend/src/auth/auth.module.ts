import { Module } from "@nestjs/common";
import { BetterAuthModule } from "./better-auth.module";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";

@Module({
  imports: [BetterAuthModule],
  controllers: [AuthController],
  providers: [JwtAuthGuard, AuthService],
  exports: [JwtAuthGuard, BetterAuthModule, AuthService],
})
export class AuthModule {}
