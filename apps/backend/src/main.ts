import * as dotenv from "dotenv";
dotenv.config();
import * as express from "express";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { AppModule } from "./app.module";
import { ApiDocumentationService } from "./shared/api-documentation.service";
import { AuthGuard } from "./auth/guards/auth.guard";
import { RolesGuard } from "./auth/guards/roles.guard";
import cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  ApiDocumentationService.configure(app);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  });

  app.use("/auth", express.json());

  // Register global guards from DI so they can use providers
  const authGuard = app.get(AuthGuard);
  const rolesGuard = app.get(RolesGuard);
  app.useGlobalGuards(authGuard, rolesGuard);

  await app.listen(process.env.PORT ?? process.env.port ?? 3000);
}
bootstrap();
