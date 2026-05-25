import { Module } from "@nestjs/common";
import { BetterAuthModule } from "./better-auth.module";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { AuthService } from "./auth.service";

@Module({
  imports: [BetterAuthModule],
  providers: [JwtAuthGuard, AuthService],
  exports: [JwtAuthGuard, BetterAuthModule, AuthService],
})
export class AuthModule {}
