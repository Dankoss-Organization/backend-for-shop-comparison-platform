import { ApiProperty } from "@nestjs/swagger";
import { MeilisearchProduct } from "../types/meilisearch.types";

export class SearchProductResponseDto implements MeilisearchProduct {
  @ApiProperty({ example: "prod-123" })
  id: string;

  @ApiProperty({ example: "prod-123" })
  productId: string;

  @ApiProperty({ example: "Apple iPhone 15" })
  canonicalName: string;

  @ApiProperty({ example: "Apple", nullable: true })
  brand: string | null;

  @ApiProperty({ example: "Electronics" })
  category: string;

  @ApiProperty({ example: "cat-001" })
  categoryId: string;

  @ApiProperty({ example: "https://cdn.example.com/iphone15.jpg" })
  media: string;

  @ApiProperty({ example: "Latest iPhone 15 model", nullable: true })
  description: string | null;

  @ApiProperty({ example: 45999, nullable: true })
  bestPrice: number | null;

  @ApiProperty({ example: 55999, nullable: true })
  oldPrice: number | null;

  @ApiProperty({ example: 17, nullable: true })
  discountPercent: number | null;

  @ApiProperty({ enum: ["UAH"] })
  currency: "UAH";

  @ApiProperty({ example: 5 })
  offersCount: number;

  @ApiProperty({ example: ["Foxtrot", "Eldorado"], isArray: true })
  storeNames: string[];

  @ApiProperty({ example: 1716030000000 })
  updatedAt: number;
}

export class SearchResultsDto {
  @ApiProperty({
    description: "List of product search results",
    type: [SearchProductResponseDto],
    isArray: true,
  })
  results: MeilisearchProduct[];

  @ApiProperty({
    description: "Total number of matching products",
    example: 150,
  })
  totalHits: number;

  @ApiProperty({
    description: "Original search query",
    example: "apple iphone",
  })
  query: string;

  @ApiProperty({
    description: "Time taken to process search (milliseconds)",
    example: 42,
  })
  processingTimeMs: number;

  @ApiProperty({
    description: "Number of results in this response",
    example: 20,
  })
  count: number;

  @ApiProperty({
    description: "Current offset",
    example: 0,
  })
  offset: number;

  @ApiProperty({
    description: "Items per page",
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: "Total pages available",
    example: 8,
  })
  totalPages: number;

  @ApiProperty({
    description: "Current page number",
    example: 1,
  })
  page: number;
}

export class HealthCheckResponseDto {
  @ApiProperty({
    description: "Health status",
    example: "healthy",
    enum: ["healthy", "unhealthy"],
  })
  status: "healthy" | "unhealthy";

  @ApiProperty({
    description: "Health status message",
    example: "Meilisearch is running",
  })
  message: string;

  @ApiProperty({
    description: "Meilisearch version",
    example: "1.10.2",
    required: false,
  })
  version?: string;

  @ApiProperty({
    description: "Timestamp when check was performed",
    example: 1716030000000,
  })
  timestamp: number;
}

export class IndexStatsResponseDto {
  @ApiProperty({
    description: "Number of indexed products",
    example: 10000,
  })
  numberOfDocuments: number;

  @ApiProperty({
    description: "Whether indexing is currently in progress",
    example: false,
  })
  isIndexing: boolean;

  @ApiProperty({
    description: "Last update timestamp (Unix milliseconds)",
    example: 1716030000000,
  })
  lastUpdate: number;

  @ApiProperty({
    description: "Timestamp when stats were retrieved",
    example: 1716030000000,
  })
  timestamp: number;
}
