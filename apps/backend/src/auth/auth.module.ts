import { Module } from "@nestjs/common";
import { BetterAuthModule } from "./better-auth.module";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Module({
  imports: [BetterAuthModule],
  providers: [JwtAuthGuard],
  exports: [JwtAuthGuard, BetterAuthModule],
})
export class AuthModule {}
