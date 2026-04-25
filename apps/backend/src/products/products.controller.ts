import { Controller, Get, Param, Query } from "@nestjs/common";
import { GetProductOffersQueryDto } from "./dto/get-product-offers-query.dto";
import { GetProductPriceHistoryQueryDto } from "./dto/get-product-price-history-query.dto";
import { GetRelatedProductsQueryDto } from "./dto/get-related-products-query.dto";
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
    @Query() query: GetProductOffersQueryDto,
  ) {
    return this.productsService.getProductOffers(id, {
      sort: query.sort ?? "price",
      inStock: query.inStock ?? false,
    });
  }

  @Get(":id/price-history")
  getProductPriceHistory(
    @Param("id") id: string,
    @Query() query: GetProductPriceHistoryQueryDto,
  ) {
    return this.productsService.getProductPriceHistory(id, query.period ?? "30d");
  }

  @Get(":id/related")
  getRelatedProducts(
    @Param("id") id: string,
    @Query() query: GetRelatedProductsQueryDto,
  ) {
    return this.productsService.getRelatedProducts(id, query.limit ?? 8);
  }
}
