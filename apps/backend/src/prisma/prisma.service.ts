import {
  Inject,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    const connectionString =
      process.env.DATABASE_URL ?? process.env.DATABASE_TEST_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL (or DATABASE_TEST_URL) is not defined in environment variables.",
      );
    }

    const pool = new PrismaPg({ connectionString });
    super({ adapter: pool });
  }

  async onModuleInit() {
    this.logger.info("Connecting to database", { service: PrismaService.name });

    try {
      await this.$connect();
      this.logger.info("Database connection established", {
        service: PrismaService.name,
      });
    } catch (error) {
      this.logger.error("Failed to connect to database", {
        service: PrismaService.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.info("Disconnecting from database", {
      service: PrismaService.name,
    });

    try {
      await this.$disconnect();
      this.logger.info("Database connection closed", {
        service: PrismaService.name,
      });
    } catch (error) {
      this.logger.error("Failed to disconnect from database", {
        service: PrismaService.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
