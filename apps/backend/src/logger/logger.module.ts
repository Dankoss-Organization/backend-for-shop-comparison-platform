import { Module } from "@nestjs/common";
import { WinstonModule } from "nest-winston";
import * as winston from "winston";

const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
const logLevel =
  process.env.LOG_LEVEL ?? (appEnv === "production" ? "info" : "debug");

@Module({
  imports: [
    WinstonModule.forRoot({
      level: logLevel,
      levels: winston.config.npm.levels,
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.metadata({
          fillExcept: ["message", "level", "timestamp"],
        }),
        winston.format.json(),
      ),
      transports: [new winston.transports.Console()],
    }),
  ],
})
export class LoggerModule {}
