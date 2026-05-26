import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BetterAuthService } from "./better-auth.service";

@Module({
  imports: [ConfigModule],
  providers: [BetterAuthService],
  exports: [BetterAuthService],
})
export class BetterAuthModule {}
