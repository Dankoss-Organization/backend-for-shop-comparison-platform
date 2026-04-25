import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ProductsService } from "./products.service";

@Controller("api/v1/products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get(":id/card")
  getProductCard(@Param("id") id: string) {
    return this.productsService.getProductCard(id);
  }

  @Get(":id/offers")
  getProductOffers(
    @Param("id") id: string,
    @Query("sort") sort: "price" | "discount" | "updated" = "price",
    @Query("inStock") inStock?: string,
  ) {
    return this.productsService.getProductOffers(id, {
      sort,
      inStock: inStock === "true",
    });
  }

  @Get(":id/price-history")
  getProductPriceHistory(
    @Param("id") id: string,
    @Query("period") period = "30d",
  ) {
    return this.productsService.getProductPriceHistory(id, period);
  }

  @Get(":id/related")
  getRelatedProducts(
    @Param("id") id: string,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.productsService.getRelatedProducts(id, limit ?? 8);
  }
}
