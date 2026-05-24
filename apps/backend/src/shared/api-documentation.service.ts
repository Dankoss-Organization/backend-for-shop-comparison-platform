import { INestApplication, ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export class ApiDocumentationService {
  static createDocument(app: INestApplication) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Shop Comparison Platform API")
      .setDescription("Backend API for product cards, offers, price history, and related products.")
      .setVersion("1.0")
      .addTag("products")
      .build();

    return SwaggerModule.createDocument(app, swaggerConfig);
  }

  static configure(app: INestApplication) {
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    const swaggerDocument = this.createDocument(app);

    SwaggerModule.setup("api/docs", app, swaggerDocument, {
      jsonDocumentUrl: "api/docs-json",
    });
  }
}
