import { Test, TestingModule } from "@nestjs/testing";
import { ShopComparisonPlatformBackendController } from "./app.controller";
import { ShopComparisonPlatformBackendService } from "./app.service";

describe("ShopComparisonPlatformBackendController", () => {
  let shopComparisonPlatformBackendController: ShopComparisonPlatformBackendController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ShopComparisonPlatformBackendController],
      providers: [ShopComparisonPlatformBackendService],
    }).compile();

    shopComparisonPlatformBackendController =
      app.get<ShopComparisonPlatformBackendController>(
        ShopComparisonPlatformBackendController,
      );
  });

  describe("root", () => {
    it('should return "Hello World!"', () => {
      expect(shopComparisonPlatformBackendController.getHello()).toBe(
        "Hello World!",
      );
    });
  });
});
