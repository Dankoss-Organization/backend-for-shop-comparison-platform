import * as dotenv from "dotenv";
dotenv.config();
import { NestFactory } from "@nestjs/core";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { AppModule } from "./app.module";
import { ApiDocumentationService } from "./shared/api-documentation.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  ApiDocumentationService.configure(app);

  await app.listen(process.env.PORT ?? process.env.port ?? 3000);
}
bootstrap();
