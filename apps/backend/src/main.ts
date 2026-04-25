import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ApiDocumentationService } from "./shared/api-documentation.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  ApiDocumentationService.configure(app);

  await app.listen(process.env.PORT ?? process.env.port ?? 3000);
}
bootstrap();
