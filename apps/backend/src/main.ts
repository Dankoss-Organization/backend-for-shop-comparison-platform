import { NestFactory } from "@nestjs/core";
import { ShopComparisonPlatformBackendModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(ShopComparisonPlatformBackendModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
