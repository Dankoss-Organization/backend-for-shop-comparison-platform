import { Controller, Get } from "@nestjs/common";
import { ShopComparisonPlatformBackendService } from "./app.service";

@Controller()
export class ShopComparisonPlatformBackendController {
  constructor(
    private readonly shopComparisonPlatformBackendService: ShopComparisonPlatformBackendService,
  ) {}

  @Get()
  getHello(): string {
    return this.shopComparisonPlatformBackendService.getHello();
  }
}
