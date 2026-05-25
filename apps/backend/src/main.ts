import { NestFactory } from "@nestjs/core";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { AppModule } from "./app.module";
import { ApiDocumentationService } from "./shared/api-documentation.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  ApiDocumentationService.configure(app);

  app.enableCors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? process.env.port ?? 3000);
}
bootstrap();
